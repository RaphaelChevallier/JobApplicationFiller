'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Radar from 'radar-sdk-js' // Import Radar SDK

interface LocationAutocompleteProps {
  initialValue?: string | null
  onLocationSelect: (location: string) => void // Callback to update parent state
}

// Ensure Radar is initialized only once
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY && !Radar.isInitialized()) {
  try {
     Radar.initialize(process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY)
     console.log("Radar SDK Initialized");
  } catch (err) {
    console.error("Error initializing Radar SDK:", err);
  }
} else if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY) {
   console.warn("Radar SDK not initialized: NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY is not set.");
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ initialValue, onLocationSelect }) => {
  const [inputValue, setInputValue] = useState(initialValue || '')
  const [suggestions, setSuggestions] = useState<Radar.RadarAddress[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce function
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
     if (!Radar.isInitialized() || query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    try {
      const result = await Radar.autocomplete({
        query: query,
        layers: ['locality', 'region', 'country'], // Focus on city/region/country level
        limit: 5
      })
      setSuggestions(result.addresses || [])
      setShowSuggestions(true)
    } catch (err) {
      console.error('Radar autocomplete error:', err)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Debounced version of fetchSuggestions
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), []);

  useEffect(() => {
    setInputValue(initialValue || '')
  }, [initialValue])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setInputValue(value)
    onLocationSelect(value) // Update parent immediately for uncontrolled component behavior if needed
    debouncedFetchSuggestions(value);
  }

  const handleSuggestionClick = (address: Radar.RadarAddress) => {
    // Format the selected location (e.g., "City, State, Country" or just "City, Country")
    const formattedLocation = [
      address.city,
      address.stateCode || address.state, // Prefer state code if available
      address.countryCode
    ].filter(Boolean).join(', ');
    
    setInputValue(formattedLocation)
    setSuggestions([])
    setShowSuggestions(false)
    onLocationSelect(formattedLocation) // Update parent state with the formatted selection
  }

  // Close suggestions when clicking outside
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
      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Location (City)
      </label>
      <input
        ref={inputRef}
        id="location"
        name="location" // Name attribute for form submission
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue.length >= 3 && setShowSuggestions(true)} // Show suggestions on focus if input has text
        placeholder="Start typing a city..."
        autoComplete="off" // Disable browser autocomplete
        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((address) => (
            <li
              key={address.placeLabel || address.formattedAddress} // Use a unique key
              onClick={() => handleSuggestionClick(address)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 cursor-pointer"
            >
              {address.formattedAddress}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default LocationAutocomplete 