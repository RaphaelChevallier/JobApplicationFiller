'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface SchoolAutocompleteProps {
  initialValue?: string | null
  onSchoolSelect: (schoolName: string) => void // Callback to update parent state
}

// Define the expected structure of the CollegeAI suggestion
interface CollegeAISuggestion {
  name: string;
  // Add other fields if needed based on API response
}

const SchoolAutocomplete: React.FC<SchoolAutocompleteProps> = ({ initialValue, onSchoolSelect }) => {
  const [inputValue, setInputValue] = useState(initialValue || '')
  const [suggestions, setSuggestions] = useState<CollegeAISuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce function (same as before)
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(null, args);
      }, delay);
    };
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setLoading(true);
    setError(null);
    
    // CollegeAI Autocomplete Endpoint
    const url = new URL('https://api.collegeai.com/v1/api/autocomplete/colleges');
    url.searchParams.append('query', query);

    try {
        // No API Key header needed for this basic endpoint based on external examples
        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        if (!response.ok) {
            // Attempt to parse error, fallback to status text
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
             } catch (parseError) {
                // Ignore if response body is not JSON
             }
            throw new Error(errorMessage);
        }

        const result = await response.json();
         // Adapt based on actual CollegeAI response structure
        setSuggestions(result?.colleges || result || []) // Adjust based on actual API response field name
        setShowSuggestions(true)
    } catch (err: any) {
      console.error('CollegeAI autocomplete error:', err)
      setError('Failed to fetch school suggestions.');
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
        setLoading(false);
    }
  }

  // Debounced version
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 400), []);

  useEffect(() => {
    setInputValue(initialValue || '')
  }, [initialValue])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setInputValue(value)
    onSchoolSelect(value) // Update parent immediately
    debouncedFetchSuggestions(value);
  }

  const handleSuggestionClick = (school: CollegeAISuggestion) => {
    const schoolName = school.name; 
    setInputValue(schoolName)
    setSuggestions([])
    setShowSuggestions(false)
    onSchoolSelect(schoolName) // Update parent state
  }

  // Close suggestions when clicking outside (same as before)
   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="relative">
      <label htmlFor="schoolName" className="input-label">
        School Name
      </label>
      <input
        ref={inputRef}
        id="schoolName"
        name="schoolName" // Name attribute for form submission
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)} // Show suggestions on focus if they exist
        placeholder="Start typing a school name..."
        autoComplete="off" 
        className="input-field"
      />
       {loading && <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">Loading...</div>}
       {error && <div className="text-xs text-red-600 dark:text-red-400 pt-1">{error}</div>}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((school) => (
            <li
              key={school.name} 
              onClick={() => handleSuggestionClick(school)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 cursor-pointer capitalize"
            >
              {school.name} 
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SchoolAutocomplete 