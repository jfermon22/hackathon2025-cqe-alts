# Technical Specification - CQE Alternate Selection Enhancement

## Overview

This specification details the implementation of an LLM-powered alternate selection feature for the Custom Quotes Engine (CQE) platform. The solution will be implemented as a Greasemonkey userscript that enhances the existing buyer request interface with conversational alternate selection capabilities.

## Architecture

### High-Level Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Greasemonkey  │    │   Strands SDK   │    │  Amazon APIs    │
│   Frontend      │◄──►│   (Python)      │◄──►│  (Internal)     │
│                 │    │                 │    │                 │
│  - UI Modal     │    │  - LLM Processing│   │  - Product Search│
│  - Chat Interface│   │  - Requirements  │   │  - Product Data  │
│  - ASIN Input   │    │    Extraction    │    │  - Specifications│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   CQE APIs      │
│                 │
│ - ProcessBuyer  │
│   Request       │
└─────────────────┘
```

## HTML Interface Analysis

### Current CQE Interface Structure

Based on analysis of the actual CQE "Request a quote" page HTML, the following elements are available for integration:

#### 1. Product Table Structure
```html
<table class="ink_Table_1smr14t0 ink_Table_1smr14t1" role="grid">
  <thead>
    <tr role="row">
      <th>Item</th>
      <th>Quantity</th>
      <th>Buy now price</th>
      <th></th> <!-- Actions column -->
    </tr>
  </thead>
  <tbody>
    <tr data-key="cb064bc4-58e2-4f2c-a6f9-95de90840a0b">
      <!-- Product data cells -->
    </tr>
  </tbody>
</table>
```

#### 2. Existing Manage Item Dropdown
**Current Structure**:
```html
<div class="b-dropdown b-action-menu b-w-large">
  <button class="b-button b-dropdown-toggle b-link" aria-expanded="false">
    Manage item
  </button>
  <ul role="menu" id="drop-down-t-yARiN5yq-menu" class="b-dropdown-menu">
    <li role="presentation">
      <a id="drop-down-t-yARiN5yq-option-0" role="menuitem" class="b-clickable">
        Delete
      </a>
    </li>
  </ul>
</div>
```

**Enhancement Target**: Add "Add Alternates" as second menu option

#### 3. Available Product Context Data
From the HTML, we can extract:
- **ASIN**: `B00V5D4VX8` (from input field value)
- **Product Name**: "RKH Super Masking Tapes" 
- **Quantity**: `100` (from quantity input)
- **Price**: `$199.00` total, `$1.99` per unit
- **Product Image**: Available via `<img src="https://m.media-amazon.com/images/I/41KOXOlS4cL.jpg">`
- **Seller Info**: "SBAProTest4"

#### 4. Integration Points

**Button Placement Strategy**:
```javascript
// Target the existing dropdown menu
const dropdownMenu = document.querySelector('#drop-down-t-yARiN5yq-menu');

// Add new menu item
const alternatesOption = document.createElement('li');
alternatesOption.setAttribute('role', 'presentation');
alternatesOption.innerHTML = `
  <a id="add-alternates-option" role="menuitem" tabindex="-1" class="b-clickable">
    Add Alternates
  </a>
`;

// Insert before Delete option
dropdownMenu.insertBefore(alternatesOption, dropdownMenu.firstChild);
```

**Data Extraction Strategy**:
```javascript
function extractProductContext(rowElement) {
  const productData = {
    asin: document.querySelector('#add-asin-or-isbn-form')?.value || '',
    name: rowElement.querySelector('.ink_typography_1lzltdc5')?.textContent || '',
    quantity: rowElement.querySelector('.product-quantity')?.value || '',
    price: {
      total: rowElement.querySelector('.b-text-bold')?.textContent || '',
      unit: rowElement.querySelector('.b-text-carbon.b-text-bold')?.textContent || ''
    },
    image: rowElement.querySelector('img')?.src || '',
    seller: rowElement.querySelector('.seller-performance-link')?.textContent || ''
  };
  
  return productData;
}
```

#### 5. Modal Integration Approach

**Overlay Strategy**: Use existing CQE modal patterns
```javascript
// Create modal overlay matching CQE styles
const modalOverlay = document.createElement('div');
modalOverlay.className = 'b-modal-overlay'; // Use existing CQE modal classes
modalOverlay.innerHTML = `
  <div class="b-modal-content cqe-alternates-modal">
    <!-- Modal content here -->
  </div>
`;

// Append to existing modal root
const modalRoot = document.querySelector('#offer-selection-slider-root') || document.body;
modalRoot.appendChild(modalOverlay);
```

#### 6. Styling Integration

**CSS Class Mapping**:
- Use existing `b-button` classes for consistency
- Leverage `ink_` prefixed classes for layout
- Match existing `b-dropdown-menu` styling
- Utilize existing `b-modal-*` classes for modal

**Key CSS Classes to Reuse**:
- `b-button b-outline` - For secondary buttons
- `b-button` - For primary buttons  
- `b-form-control` - For input fields
- `ink_flexbox_*` - For layout containers
- `b-text-*` - For typography consistency

This analysis confirms our implementation approach is viable and provides specific integration points for the Greasemonkey userscript.

## User Interface Specification

### 1. Entry Point Enhancement

**Location**: CQE Buyer Request Dashboard
**Element**: Add "Add Alternates" button next to existing "Add Item" button

```html
<button id="cqe-add-alternates-btn" class="cqe-primary-button">
  Add Alternates
</button>
```

**Styling**: Match existing CQE button styles for consistency

### 2. Modal Interface

**Trigger**: Click "Add Alternates" button
**Type**: Overlay modal with chat interface
**Dimensions**: 600px width, 500px height, centered

#### Modal Structure
```html
<div id="cqe-alternates-modal" class="cqe-modal-overlay">
  <div class="cqe-modal-content">
    <div class="cqe-modal-header">
      <h3>Add Alternate Products</h3>
      <button class="cqe-modal-close">&times;</button>
    </div>
    
    <div class="cqe-chat-container">
      <div id="cqe-chat-messages" class="cqe-chat-messages">
        <!-- Chat messages appear here -->
      </div>
      
      <div class="cqe-chat-input-container">
        <input type="text" id="cqe-chat-input" placeholder="Type your response...">
        <button id="cqe-chat-send">Send</button>
      </div>
    </div>
    
    <div id="cqe-manual-asin-section" class="cqe-section" style="display:none;">
      <h4>Add ASINs Manually</h4>
      <input type="text" id="cqe-manual-asin" placeholder="Enter ASIN (e.g., B08N5WRWNW)">
      <button id="cqe-add-asin">Add Alt</button>
      <div id="cqe-manual-asins-list"></div>
    </div>
    
    <div id="cqe-alternates-selection" class="cqe-section" style="display:none;">
      <h4>Select Suitable Alternates</h4>
      <div id="cqe-suggested-alternates"></div>
    </div>
    
    <div class="cqe-modal-footer">
      <button id="cqe-cancel-alternates">Cancel</button>
      <button id="cqe-confirm-alternates" disabled>Add Selected Alternates</button>
    </div>
  </div>
</div>
```

## Conversation Flow Specification

### 1. Conversation Script

#### Step 1: Willingness Check
```javascript
const CONVERSATION_STEPS = {
  WILLINGNESS_CHECK: {
    message: "Would you be willing to accept alternate ASINs for this request? This can help you get better pricing and availability options.",
    responses: ["Yes", "No"],
    nextStep: {
      "Yes": "REQUIREMENTS_GATHERING",
      "No": "END_CONVERSATION"
    }
  },
  
  REQUIREMENTS_GATHERING: {
    message: "Great! What are the key attributes a suitable alternate needs to meet to be suitable for you? For example: specific technical specifications, price range, brand preferences, or use case requirements.",
    type: "free_text",
    nextStep: "PROCESS_REQUIREMENTS"
  },
  
  PROCESS_REQUIREMENTS: {
    // LLM processing step
    nextStep: "PRESENT_ALTERNATES"
  },
  
  PRESENT_ALTERNATES: {
    message: "Based on your requirements, I found these potential alternates. Please select the ones that would work for you:",
    type: "selection",
    nextStep: "MANUAL_ADDITION"
  },
  
  MANUAL_ADDITION: {
    message: "You can also add specific ASINs manually if you have alternates in mind:",
    type: "manual_input",
    nextStep: "SUMMARY_GENERATION"
  },
  
  SUMMARY_GENERATION: {
    message: "I'll now create a summary of your requirements to share with suppliers. This will help them understand what you're looking for.",
    nextStep: "END_CONVERSATION"
  }
};
```

### 2. LLM Integration Points

#### Requirements Processing
```python
# Strands SDK integration for requirements extraction
def process_customer_requirements(user_input):
    prompt = f"""
    Extract key product requirements from this customer input:
    "{user_input}"
    
    Return a structured JSON with:
    - specifications: technical specs needed
    - price_constraints: budget or price preferences
    - use_case: intended use or context
    - brand_preferences: preferred or excluded brands
    - must_have_features: essential features
    - nice_to_have_features: preferred but optional features
    """
    
    response = strands_client.generate(prompt)
    return parse_requirements(response)
```

#### Search Term Generation
```python
def generate_search_terms(requirements):
    prompt = f"""
    Based on these product requirements:
    {requirements}
    
    Generate 3-5 optimized search terms for finding suitable alternates on Amazon.
    Focus on key specifications and use cases rather than specific brands.
    """
    
    response = strands_client.generate(prompt)
    return extract_search_terms(response)
```

#### Alternate Evaluation
```python
def evaluate_alternates(products, requirements):
    prompt = f"""
    Evaluate these products against customer requirements:
    
    Requirements: {requirements}
    
    Products: {products}
    
    For each product, provide:
    - suitability_score: 0-100
    - matching_features: list of features that match requirements
    - missing_features: list of required features not met
    - explanation: brief explanation of why it's suitable or not
    
    Return top 8 products ranked by suitability.
    """
    
    response = strands_client.generate(prompt)
    return parse_evaluations(response)
```

## API Integration Specification

### 1. Amazon Internal Search API

```javascript
async function searchAmazonProducts(searchTerms) {
  const searchResults = [];
  
  for (const term of searchTerms) {
    const response = await fetch('/internal/product-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CQE-Token': getCQEToken()
      },
      body: JSON.stringify({
        query: term,
        limit: 20,
        include_fields: ['name', 'description', 'specifications', 'asin', 'price']
      })
    });
    
    const results = await response.json();
    searchResults.push(...results.products);
  }
  
  return searchResults;
}
```

### 2. CQE ProcessBuyerRequest API Enhancement

```javascript
async function submitEnhancedRequest(originalRequest, alternates, conversationSummary) {
  const enhancedRequest = {
    ...originalRequest,
    alternates: alternates.map(alt => ({
      asin: alt.asin,
      customer_selected: true,
      source: 'customer_conversation'
    })),
    customer_context: {
      requirements_summary: conversationSummary,
      conversation_timestamp: new Date().toISOString(),
      alternates_accepted: true
    }
  };
  
  const response = await fetch('/api/cqe/process-buyer-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CQE-Token': getCQEToken()
    },
    body: JSON.stringify(enhancedRequest)
  });
  
  return response.json();
}
```

## Data Models

### 1. Customer Requirements
```javascript
const CustomerRequirements = {
  specifications: {
    technical_specs: [],
    performance_requirements: [],
    compatibility_needs: []
  },
  constraints: {
    max_price: null,
    min_price: null,
    brand_preferences: [],
    brand_exclusions: []
  },
  use_case: {
    description: "",
    environment: "",
    user_type: "",
    volume: null
  },
  features: {
    must_have: [],
    nice_to_have: [],
    not_needed: []
  }
};
```

### 2. Alternate Product
```javascript
const AlternateProduct = {
  asin: "",
  name: "",
  description: "",
  specifications: {},
  price: {
    amount: null,
    currency: "USD"
  },
  suitability: {
    score: 0,
    matching_features: [],
    missing_features: [],
    explanation: ""
  },
  selected: false,
  source: "llm_suggested" | "customer_manual"
};
```

### 3. Conversation Summary
```javascript
const ConversationSummary = {
  customer_requirements: "",
  selected_alternates: [],
  key_specifications: [],
  use_case_context: "",
  price_sensitivity: "",
  brand_preferences: "",
  generated_timestamp: "",
  conversation_id: ""
};
```

## Validation Specifications

### 1. ASIN Validation
```javascript
const ASIN_REGEX = /^([0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9})$/;

function validateASIN(asin) {
  if (!asin || asin.length !== 10) {
    return { valid: false, error: "ASIN must be exactly 10 characters long" };
  }
  
  if (!ASIN_REGEX.test(asin)) {
    return { 
      valid: false, 
      error: "Invalid ASIN format. Must be 10 digits (last can be X) or start with letter followed by 9 alphanumeric characters" 
    };
  }
  
  return { valid: true };
}
```

### 2. Product Data Validation
```javascript
function validateProductData(product) {
  const required_fields = ['asin', 'name', 'description'];
  const missing_fields = required_fields.filter(field => !product[field]);
  
  if (missing_fields.length > 0) {
    return { 
      valid: false, 
      error: `Missing required fields: ${missing_fields.join(', ')}` 
    };
  }
  
  const asin_validation = validateASIN(product.asin);
  if (!asin_validation.valid) {
    return asin_validation;
  }
  
  return { valid: true };
}
```

## Error Handling

### 1. LLM Service Errors
```javascript
async function handleLLMError(error, fallback_action) {
  console.error('LLM Service Error:', error);
  
  switch (error.type) {
    case 'timeout':
      return showMessage("The service is taking longer than expected. Please try again.");
    case 'rate_limit':
      return showMessage("Too many requests. Please wait a moment and try again.");
    case 'service_unavailable':
      return fallback_action();
    default:
      return showMessage("An error occurred processing your request. Please try again.");
  }
}
```

### 2. API Integration Errors
```javascript
async function handleAPIError(response, operation) {
  if (!response.ok) {
    const error_data = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 401:
        return { error: "Authentication required. Please refresh the page." };
      case 403:
        return { error: "Access denied. You may not have permission for this operation." };
      case 429:
        return { error: "Too many requests. Please wait and try again." };
      case 500:
        return { error: `Server error during ${operation}. Please try again later.` };
      default:
        return { error: error_data.message || `Error during ${operation}` };
    }
  }
  
  return null;
}
```

## Performance Considerations

### 1. Lazy Loading
- Load Strands SDK only when modal is opened
- Cache product search results for session duration
- Debounce user input in chat interface

### 2. Request Optimization
- Batch product lookups where possible
- Implement request caching for repeated searches
- Use pagination for large result sets

### 3. User Experience
- Show loading indicators for LLM processing
- Implement progressive disclosure for complex forms
- Provide clear feedback for all user actions

## Security Considerations

### 1. Input Sanitization
- Sanitize all user inputs before LLM processing
- Validate ASIN format strictly
- Escape HTML in chat messages

### 2. API Security
- Use existing CQE authentication tokens
- Validate all API responses
- Implement CSRF protection where applicable

### 3. Data Privacy
- No persistent storage of conversation data
- Clear sensitive data on modal close
- Respect existing CQE privacy policies

---
*Created: 2025-07-22*
*Status: Complete technical specification*
