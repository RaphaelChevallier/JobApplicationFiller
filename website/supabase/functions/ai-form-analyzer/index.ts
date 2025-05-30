import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenAI, Type } from "@google/genai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserProfile {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  resume_url?: string
  cover_letter?: string
  skills: string[]
  experience: Array<{
    company: string
    position: string
    start_date: string
    end_date: string
    description: string
  }>
  education: Array<{
    institution: string
    degree: string
    field: string
    graduation_date: string
  }>
}

interface FormAnalysisRequest {
  url: string
  user_id: string
}

interface FormField {
  selector: {
    type: string
    value: string
  }
  type: string
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

interface PageAnalysis {
  page_number: number
  page_url: string
  page_title: string
  fields: FormField[]
  navigation: {
    has_next: boolean
    next_button?: {
      selector: {
        type: string
        value: string
      }
    }
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication - extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Initialize Supabase client with anon key for user auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Log the anon key being used
    console.log('Supabase Anon Key (first 10 chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'NOT SET');
    
    // Create anon client for user verification - this is the correct approach for Edge Functions
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    
    // Debug: Log token info (first/last 10 chars only for security)
    console.log('Token received:', token.substring(0, 10) + '...' + token.substring(token.length - 10))
    console.log('Token length:', token.length)
    console.log('Supabase URL:', supabaseUrl)
    console.log('Service key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...')
    
    // Try to decode the JWT to see what's in it
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        console.log('JWT payload:', {
          sub: payload.sub,
          aud: payload.aud,
          role: payload.role,
          exp: payload.exp,
          iss: payload.iss,
          hasAllClaims: !!(payload.sub && payload.aud && payload.role)
        })
      } else {
        console.error('Invalid JWT format - expected 3 parts, got:', parts.length)
      }
    } catch (e) {
      console.error('Failed to decode JWT:', e.message)
    }
    
    // Verify the JWT token and get user using anon client
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError) {
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        cause: authError.cause,
        stack: authError.stack
      })
    }
    
    console.log('Auth result from supabaseAuth.auth.getUser(token):', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      userRole: user?.role,
      error: authError?.message 
    })
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired token', 
          details: authError?.message,
          debug: {
            tokenLength: token.length,
            hasUser: !!user,
            errorCode: authError?.status
          }
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use service role client for database operations (elevated permissions needed)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { url, user_id } = await req.json() as FormAnalysisRequest

    if (!url || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: url and user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify that the authenticated user matches the requested user_id
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch - you can only analyze forms for your own account' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user profile from existing tables
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        street_address,
        city,
        state_province,
        zip_postal_code,
        country,
        linkedin_url,
        github_url,
        portfolio_url,
        resume_url,
        cover_letter_url,
        desired_salary,
        work_authorization,
        willing_to_relocate
      `)
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile or profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found or error fetching it', details: profileError?.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get work experience
    const { data: workExperience } = await supabase
      .from('work_experience')
      .select('company_name, job_title, start_date, end_date, description')
      .eq('user_id', user_id)
      .order('start_date', { ascending: false })

    // Get education
    const { data: education } = await supabase
      .from('education')
      .select('school_name, degree, field_of_study, start_date, end_date')
      .eq('user_id', user_id)
      .order('start_date', { ascending: false })

    // Get skills
    const { data: skills } = await supabase
      .from('skills')
      .select('skill_name, proficiency')
      .eq('user_id', user_id)

    // Transform the data to match the UserProfile interface
    const transformedProfile: UserProfile = {
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: user.email || '', // Get email from the authenticated user object
      phone: profile.phone || '',
      address: profile.street_address || '',
      city: profile.city || '',
      state: profile.state_province || '',
      zip_code: profile.zip_postal_code || '',
      linkedin_url: profile.linkedin_url,
      github_url: profile.github_url,
      portfolio_url: profile.portfolio_url,
      resume_url: profile.resume_url,
      cover_letter: profile.cover_letter_url,
      skills: skills?.map((s: any) => s.skill_name) || [],
      experience: workExperience?.map((exp: any) => ({
        company: exp.company_name,
        position: exp.job_title,
        start_date: exp.start_date,
        end_date: exp.end_date || 'Present',
        description: exp.description || ''
      })) || [],
      education: education?.map((edu: any) => ({
        institution: edu.school_name,
        degree: edu.degree,
        field: edu.field_of_study,
        graduation_date: edu.end_date || edu.start_date
      })) || []
    }

    // Generate AI instructions using Gemini - AI will analyze the URL directly
    const instructions = await generateInstructions(url, transformedProfile)

    return new Response(
      JSON.stringify(instructions),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in ai-form-analyzer:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Generate AI instructions using Gemini
 */
async function generateInstructions(url: string, profile: UserProfile) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY not configured');
    // Fallback to basic instructions if API key is missing
    return generateFallbackInstructions(url, profile);
  }

  // Initialize the GoogleGenerativeAI client
  const genAI = new GoogleGenAI({apiKey: geminiApiKey});

  // Define the response schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      success: {
        type: Type.BOOLEAN,
        description: "True only if every required field has a non-empty value"
      },
      pages: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            page_number: { type: Type.INTEGER },
            page_url: { type: Type.STRING },
            page_title: { type: Type.STRING },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    enum: ["fill_field", "select_option", "check_checkbox", "click_button"]
                  },
                  selector: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        enum: ["id", "name", "css", "xpath", "placeholder", "aria_label"]
                      },
                      value: { type: Type.STRING }
                    },
                    required: ["type", "value"]
                  },
                  value: { type: Type.STRING },
                  field_description: { type: Type.STRING },
                  confidence: {
                    type: Type.NUMBER,
                    minimum: 0,
                    maximum: 1
                  },
                  required: { type: Type.BOOLEAN }
                },
                required: ["type", "selector", "value", "field_description", "confidence", "required"]
              }
            },
            navigation: {
              type: Type.OBJECT,
              properties: {
                has_next: { type: Type.BOOLEAN },
                next_button: {
                  type: Type.OBJECT,
                  properties: {
                    selector: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        value: { type: Type.STRING }
                      },
                      required: ["type", "value"]
                    }
                  }
                }
              },
              required: ["has_next"]
            },
            validation: {
              type: Type.OBJECT,
              properties: {
                success_indicators: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                error_indicators: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["success_indicators", "error_indicators"]
            }
          },
          required: ["page_number", "page_url", "page_title", "instructions", "navigation", "validation"]
        }
      },
      total_pages: { type: Type.INTEGER },
      estimated_completion_time: { type: Type.INTEGER },
      user_profile_used: {
        type: Type.OBJECT,
        properties: {
          first_name: { type: Type.STRING },
          last_name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          address: { type: Type.STRING },
          city: { type: Type.STRING },
          state: { type: Type.STRING },
          zip_code: { type: Type.STRING }
        }
      }
    },
    required: ["success", "pages", "total_pages", "estimated_completion_time", "user_profile_used"]
  };

  const promptText = `
You are an AI assistant that helps fill job application forms. You will be given a URL to a job application page and a user profile. Your task is to:

1. Analyze the job application page at the given URL
2. Identify all form fields that need to be filled
3. Match the form fields to the user's profile data
4. Generate precise instructions for filling the form

URL TO ANALYZE: ${url}
Use the attached tools to fetch and inspect the live page before answering. You must call at least one tool.

USER PROFILE:
${JSON.stringify(profile, null, 2)}

INSTRUCTION TYPES:
- fill_field: Fill text inputs and textareas
- select_option: Select dropdown options
- check_checkbox: Check/uncheck checkboxes
- click_button: Click buttons

SELECTOR TYPES:
- id: Element ID (preferred)
- name: Element name attribute
- css: CSS selector
- xpath: XPath expression
- placeholder: Find by placeholder text
- aria_label: Find by aria-label

MATCHING RULES:
1. Analyze the actual form fields on the page at the URL
2. Match form fields to user profile data based on field labels, names, placeholders, and context
3. Use high confidence (0.9+) for exact matches, lower for fuzzy matches
4. For name fields: use first_name, last_name from profile
5. For contact: use email, phone from profile
6. For address: use address, city, state, zip_code from profile
7. For experience: format appropriately for text areas
8. For skills: join array with commas if needed
9. Generate multiple selector options for each field for reliability

IMPORTANT: You must actually visit and analyze the URL provided. Do not make assumptions about the form structure.
`;

  try {
    const geminiApiResponse = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: promptText,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{urlContext: {}}],
      },
    });

    if (!geminiApiResponse) {
        console.error('Gemini API (SDK) did not return a response object.');
        throw new Error('Gemini API (SDK) did not return a response object.');
    }
    
    const generatedText = geminiApiResponse.text;
    console.log('generatedText', generatedText);
    console.log('generatedUrlContext', geminiApiResponse.candidates[0].urlContextMetadata)
    
    // Only log search metadata if it exists (when googleSearch tool is used)
    const groundingMetadata = geminiApiResponse.candidates[0]?.groundingMetadata;
    if (groundingMetadata?.searchEntryPoint?.renderedContent) {
      console.log('generatedSearchMetadata', groundingMetadata.searchEntryPoint.renderedContent);
    }

    // Since we're using structured output, the response should already be valid JSON
    const instructions = JSON.parse(generatedText);
    console.log('instructions', instructions);
    
    // Validate the response format
    if (instructions.success === undefined || !Array.isArray(instructions.pages)) {
      console.error('Invalid instruction format from Gemini (SDK):', instructions);
      throw new Error('Invalid instruction format from Gemini (SDK)');
    }

    return instructions;

  } catch (error) {
    console.error('Error calling Gemini API with SDK:', error);
    if (error.message && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
        console.error('Please check your GEMINI_API_KEY. It might be invalid, missing permissions, or not enabled for the "generativelanguage.googleapis.com" service in your Google Cloud project.');
    } else if (error.message && error.message.includes('fetch failed')) {
        console.error('The SDK encountered a network issue. Check Supabase outbound network connectivity and Gemini API status.');
    }
    
    // Fallback: generate basic instructions without AI
    console.log('Falling back to basic instructions due to Gemini API error.');
    return generateFallbackInstructions(url, profile);
  }
}

/**
 * Generate fallback instructions without AI
 */
function generateFallbackInstructions(url: string, profile: UserProfile) {
  const instructions = {
    success: true,
    pages: [{
      page_number: 1,
      page_url: url,
      page_title: 'Job Application Form',
      instructions: [
        // Basic fallback instructions - just provide common field mappings
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'firstName' },
          value: profile.first_name || '',
          field_description: 'First Name',
          confidence: 0.7,
          required: true
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'lastName' },
          value: profile.last_name || '',
          field_description: 'Last Name',
          confidence: 0.7,
          required: true
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'email' },
          value: profile.email || '',
          field_description: 'Email',
          confidence: 0.8,
          required: true
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'phone' },
          value: profile.phone || '',
          field_description: 'Phone',
          confidence: 0.7,
          required: false
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'address' },
          value: profile.address || '',
          field_description: 'Address',
          confidence: 0.7,
          required: false
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'city' },
          value: profile.city || '',
          field_description: 'City',
          confidence: 0.7,
          required: false
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'state' },
          value: profile.state || '',
          field_description: 'State',
          confidence: 0.7,
          required: false
        },
        {
          type: 'fill_field',
          selector: { type: 'name', value: 'zipCode' },
          value: profile.zip_code || '',
          field_description: 'Zip Code',
          confidence: 0.7,
          required: false
        }
      ],
      navigation: { has_next: false },
      validation: {
        success_indicators: ['Form filled'],
        error_indicators: ['Error', 'Required field missing']
      }
    }],
    total_pages: 1,
    estimated_completion_time: 15000,
    user_profile_used: {
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      zip_code: profile.zip_code || ''
    }
  }
  
  return instructions
} 