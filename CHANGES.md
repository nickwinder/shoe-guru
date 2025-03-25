# Shoe Data Extraction Improvements

## Overview
This document outlines the changes made to improve the reliability of the LLM call for extracting shoe data, specifically ensuring that when data is not present, null values are properly returned.

## Changes Made

### 1. Enhanced System Prompt
The system prompt for the LLM has been improved to more strongly emphasize returning null when data is not present:

- Added an "IMPORTANT" prefix to make the instruction about returning null more prominent
- Expanded the instruction to specify that if information is not available OR the model is uncertain about its value, it MUST return null
- Added explicit instructions for numeric fields (price, weight, stack height, heel-to-toe drop) to only provide a value if a specific number can be found, otherwise return null
- Added similar explicit instructions for text fields to only provide a value if specific text can be found, otherwise return null

### 2. Post-Processing of LLM Results
Added a new `validateAndCleanShoeData` function that:

- Creates a deep copy of the data to avoid modifying the original object
- Validates and cleans specifications, ensuring numeric fields are either valid numbers or null
- Validates and cleans version information, ensuring numeric fields are either valid numbers or null
- Ensures string fields are either valid strings or null
- Sets default values for required fields when they're missing

### 3. Enhanced Error Handling
Improved error handling by:

- Returning a null-filled object that matches the schema when an error occurs, using a new `createEmptyShoeData` function
- This ensures that even if the LLM call fails, the application won't crash and will instead get a valid object with null values

### 4. Helper Functions
Added helper functions:

- `createEmptyShoeData`: Creates an empty shoe data object with all fields set to null except required fields
- `createEmptyVersionData`: Creates an empty version data object with all fields set to null except required fields

## Benefits

These changes provide several benefits:

1. **More Reliable Data Extraction**: The enhanced prompt helps the LLM better understand when to return null values.
2. **Data Validation**: The post-processing step ensures that all data is properly validated and cleaned.
3. **Graceful Error Handling**: Even if the LLM call fails, the application will receive a valid object with null values.
4. **Consistent Data Structure**: The helper functions ensure that the data structure is consistent, even when data is missing.

## Testing

The changes have been designed to be backward compatible with the existing code and should not introduce any new issues. The existing test case should continue to pass, and the application should now more reliably handle cases where shoe data is not present in the HTML content.
