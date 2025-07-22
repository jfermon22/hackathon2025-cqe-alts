# CQE HTML Interface Analysis

## Overview

This document provides detailed analysis of the actual CQE "Request a quote" page HTML structure, identifying specific integration points for implementing the Alternate Selection Enhancement feature.

## Page Context

**URL Pattern**: Custom Quotes Engine bulk ordering interface
**Page Title**: "Request a quote"
**Primary Function**: Add items for bulk quote requests ($10,000+ or 999+ units)

## Key HTML Elements

### 1. Page Structure

```html
<div class="b-container b-pt-large b-mb-large">
  <div class="ink_legacy_5hrn0w0 ink_root_4alms10 ink_appContainer_nwx04v0">
    <!-- Breadcrumb navigation -->
    <nav aria-label="breadcrumb">
      <ol class="b-breadcrumb b-mb-medium">
        <li><a class="breadcrumb-link">Bulk ordering</a></li>
        <li aria-current="page">Request a quote</li>
      </ol>
    </nav>
    
    <!-- Page header -->
    <h1 id="cqe_quote_request_a_quote_header">Request a quote</h1>
    
    <!-- Tab interface -->
    <div class="ink_TabGroup_1to60lg0">
      <!-- Add items tab (active) -->
      <!-- Enter quote details tab -->
    </div>
  </div>
</div>
```

### 2. Product Input Section

#### ASIN Input Field
```html
<div class="b-form b-w-double-large b-mb-0">
  <label for="add-asin-or-isbn-form">
    <div>Enter item ASIN or ISBN number</div>
  </label>
  <input id="add-asin-or-isbn-form" 
         class="b-form-control" 
         type="text" 
         value="B00V5D4VX8">
</div>
```

**Integration Point**: This input contains the current ASIN being processed

#### Quantity Input
```html
<div class="b-form b-w-base b-mb-0">
  <label for="item-quantity">Quantity</label>
  <input id="item-quantity" 
         class="b-form-control" 
         type="number" 
         value="">
</div>
```

#### Add Item Button
```html
<button class="b-button" 
        aria-disabled="false" 
        role="button" 
        type="submit" 
        id="add-item-btn">
  Add Item
</button>
```

### 3. Items Table Structure

#### Table Container
```html
<table class="ink_Table_1smr14t0 ink_Table_1smr14t1" 
       role="grid" 
       aria-label="[object Object]" 
       id="react-aria8446024507-20">
  <thead role="rowgroup">
    <tr role="row">
      <th data-key="product-information-table-item-column">Item</th>
      <th data-key="product-information-table-quantity-column">Quantity</th>
      <th data-key="product-information-table-buyNowPrice-column">Buy now price</th>
      <th data-key="product-information-table-select-other-offer-column"></th>
    </tr>
  </thead>
  <tbody role="rowgroup">
    <!-- Product rows -->
  </tbody>
</table>
```

#### Product Row Example
```html
<tr role="row" 
    data-key="cb064bc4-58e2-4f2c-a6f9-95de90840a0b" 
    class="ink_Table_1smr14ta ink_focusRing_13vqdtd3">
  
  <!-- Item column -->
  <td role="rowheader" data-key="...:product-information-table-item-column">
    <div class="b-mr-medium">
      <div class="ink_flexbox_16ockll0 ink_flexbox_16ockll28 ink_flexbox_16ockll2o">
        <div class="b-w-base">
          <img src="https://m.media-amazon.com/images/I/41KOXOlS4cL.jpg" 
               class="image" 
               height="120" 
               width="120">
        </div>
        <div class="b-w-medium">
          <div class="ink_typography_1lzltdc5 ink_typography_1lzltdc8 ink_typography_1lzltdcb">
            RKH Super Masking Tapes
          </div>
        </div>
      </div>
    </div>
  </td>
  
  <!-- Quantity column -->
  <td role="rowheader" data-key="...:product-information-table-quantity-column">
    <fieldset class="b-w-small b-form-group">
      <input id="input-quantity" 
             class="b-w-base product-quantity b-form-control" 
             type="text" 
             value="100">
    </fieldset>
  </td>
  
  <!-- Price column -->
  <td role="rowheader" data-key="...:product-information-table-buyNowPrice-column">
    <div class="store-offer-info">
      <section class="store-offer-info-price">
        <div data-inclusive-price="199" data-inclusive-unit-price="1.99">
          <span class="b-text-medium b-text-carbon b-text-bold">$199.00</span>
          <span class="b-text-base b-text-carbon b-text-bold">$1.99</span>/Unit
        </div>
      </section>
      <div class="seller-info" data-merchant-name="SBAProTest4">
        Ships from Amazon.com and sold by 
        <a class="seller-performance-link" href="/sp?seller=A22OWRW3WUDPM">
          SBAProTest4
        </a>
      </div>
    </div>
  </td>
  
  <!-- Actions column - TARGET FOR INTEGRATION -->
  <td role="rowheader" data-key="...:product-information-table-select-other-offer-column">
    <div class="b-dropdown b-action-menu b-w-large">
      <button class="b-button b-dropdown-toggle b-link" 
              role="combobox" 
              aria-expanded="false" 
              aria-controls="drop-down-t-yARiN5yq-menu">
        Manage item
      </button>
      <ul role="menu" 
          id="drop-down-t-yARiN5yq-menu" 
          class="b-dropdown-menu">
        <li role="presentation">
          <a id="drop-down-t-yARiN5yq-option-0" 
             role="menuitem" 
             class="b-clickable">
            Delete
          </a>
        </li>
      </ul>
    </div>
  </td>
</tr>
```

### 4. Modal Root Container

```html
<div id="offer-selection-slider-root"></div>
```

**Integration Point**: This empty div can be used as the container for our modal overlay

## Data Extraction Strategy

### Product Information Available

From the HTML structure, we can extract the following data for each product row:

```javascript
function extractProductData(rowElement) {
  const rowKey = rowElement.getAttribute('data-key');
  
  return {
    // Unique identifier
    id: rowKey,
    
    // Product details
    asin: getASINFromContext(), // From input field or data attributes
    name: rowElement.querySelector('.ink_typography_1lzltdc5')?.textContent?.trim(),
    image: rowElement.querySelector('img')?.src,
    
    // Quantity
    quantity: rowElement.querySelector('.product-quantity')?.value,
    
    // Pricing
    totalPrice: rowElement.querySelector('[data-inclusive-price]')?.getAttribute('data-inclusive-price'),
    unitPrice: rowElement.querySelector('[data-inclusive-unit-price]')?.getAttribute('data-inclusive-unit-price'),
    priceDisplay: rowElement.querySelector('.b-text-bold')?.textContent,
    
    // Seller information
    seller: rowElement.querySelector('.seller-performance-link')?.textContent?.trim(),
    sellerUrl: rowElement.querySelector('.seller-performance-link')?.href,
    merchantName: rowElement.querySelector('[data-merchant-name]')?.getAttribute('data-merchant-name'),
    
    // Shipping info
    shippingInfo: rowElement.querySelector('.store-offer-info-delivery')?.textContent?.trim()
  };
}
```

### ASIN Context Extraction

```javascript
function getCurrentASIN() {
  // Primary source: ASIN input field
  const asinInput = document.querySelector('#add-asin-or-isbn-form');
  if (asinInput?.value) {
    return asinInput.value;
  }
  
  // Fallback: Extract from URL or other data attributes
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('asin') || null;
}
```

## Integration Implementation

### 1. Button Addition Strategy

```javascript
function addAlternatesButton() {
  // Find all product rows
  const productRows = document.querySelectorAll('tbody tr[data-key]');
  
  productRows.forEach(row => {
    const dropdown = row.querySelector('.b-dropdown-menu');
    if (dropdown && !dropdown.querySelector('#add-alternates-option')) {
      
      // Create new menu item
      const alternatesItem = document.createElement('li');
      alternatesItem.setAttribute('role', 'presentation');
      alternatesItem.innerHTML = `
        <a id="add-alternates-option-${row.getAttribute('data-key')}" 
           role="menuitem" 
           tabindex="-1" 
           class="b-clickable"
           data-product-key="${row.getAttribute('data-key')}">
          Add Alternates
        </a>
      `;
      
      // Add click handler
      alternatesItem.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        openAlternatesModal(row);
      });
      
      // Insert as first option (before Delete)
      dropdown.insertBefore(alternatesItem, dropdown.firstChild);
    }
  });
}
```

### 2. Modal Creation Strategy

```javascript
function createAlternatesModal() {
  const modalHtml = `
    <div id="cqe-alternates-modal" class="b-modal-overlay" style="display: none;">
      <div class="b-modal-content" style="width: 600px; max-height: 80vh;">
        <div class="b-modal-header">
          <h3>Add Alternate Products</h3>
          <button class="b-modal-close" type="button">&times;</button>
        </div>
        
        <div class="cqe-chat-container" style="height: 400px; overflow-y: auto;">
          <div id="cqe-chat-messages" class="cqe-chat-messages">
            <!-- Chat messages will be inserted here -->
          </div>
        </div>
        
        <div class="cqe-chat-input-container" style="padding: 1rem; border-top: 1px solid #ddd;">
          <div class="b-flex b-row b-gap-base">
            <input type="text" 
                   id="cqe-chat-input" 
                   class="b-form-control" 
                   placeholder="Type your response..."
                   style="flex: 1;">
            <button id="cqe-chat-send" class="b-button">Send</button>
          </div>
        </div>
        
        <div class="b-modal-footer">
          <button id="cqe-cancel-alternates" class="b-button b-outline">Cancel</button>
          <button id="cqe-confirm-alternates" class="b-button" disabled>
            Add Selected Alternates
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Insert into modal root or body
  const modalRoot = document.querySelector('#offer-selection-slider-root') || document.body;
  modalRoot.insertAdjacentHTML('beforeend', modalHtml);
  
  return document.querySelector('#cqe-alternates-modal');
}
```

### 3. Event Handling Strategy

```javascript
function setupEventHandlers() {
  // Modal close handlers
  document.addEventListener('click', (e) => {
    if (e.target.matches('.b-modal-close, #cqe-cancel-alternates')) {
      closeAlternatesModal();
    }
    
    if (e.target.matches('.b-modal-overlay')) {
      closeAlternatesModal();
    }
  });
  
  // Chat input handlers
  document.addEventListener('keypress', (e) => {
    if (e.target.matches('#cqe-chat-input') && e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.matches('#cqe-chat-send')) {
      sendChatMessage();
    }
  });
}
```

## CSS Integration

### Existing Classes to Leverage

```css
/* Button styles */
.b-button { /* Primary button styling */ }
.b-button.b-outline { /* Secondary button styling */ }
.b-button.b-link { /* Link-style button */ }

/* Form controls */
.b-form-control { /* Input field styling */ }
.b-form-group { /* Form group container */ }

/* Layout */
.b-flex { /* Flexbox container */ }
.b-row, .b-col { /* Flex direction */ }
.b-gap-base { /* Standard gap spacing */ }

/* Typography */
.b-text-bold { /* Bold text */ }
.b-text-carbon { /* Standard text color */ }
.ink_typography_* { /* Various typography styles */ }

/* Spacing */
.b-mb-base, .b-mt-base { /* Margin bottom/top */ }
.b-p-base { /* Padding */ }
```

### Custom CSS Additions

```css
/* Modal overlay */
.b-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Modal content */
.b-modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
}

/* Chat container */
.cqe-chat-container {
  display: flex;
  flex-direction: column;
}

.cqe-chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* Chat message styling */
.chat-message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
}

.chat-message.user {
  background: #e3f2fd;
  margin-left: 2rem;
}

.chat-message.assistant {
  background: #f5f5f5;
  margin-right: 2rem;
}
```

## Testing Strategy

### 1. Element Detection Tests

```javascript
function testElementDetection() {
  console.log('Testing element detection...');
  
  // Test table detection
  const table = document.querySelector('.ink_Table_1smr14t0');
  console.log('Table found:', !!table);
  
  // Test product rows
  const rows = document.querySelectorAll('tbody tr[data-key]');
  console.log('Product rows found:', rows.length);
  
  // Test dropdown menus
  const dropdowns = document.querySelectorAll('.b-dropdown-menu');
  console.log('Dropdown menus found:', dropdowns.length);
  
  // Test modal root
  const modalRoot = document.querySelector('#offer-selection-slider-root');
  console.log('Modal root found:', !!modalRoot);
}
```

### 2. Data Extraction Tests

```javascript
function testDataExtraction() {
  const rows = document.querySelectorAll('tbody tr[data-key]');
  
  rows.forEach((row, index) => {
    const data = extractProductData(row);
    console.log(`Product ${index + 1}:`, data);
  });
}
```

## Implementation Checklist

- [ ] Detect CQE quote request page
- [ ] Identify product table structure
- [ ] Extract product data from rows
- [ ] Add "Add Alternates" to dropdown menus
- [ ] Create modal overlay structure
- [ ] Implement chat interface
- [ ] Add event handlers for user interactions
- [ ] Integrate with LLM service
- [ ] Handle product search and selection
- [ ] Submit enhanced request to CQE API

---
*Created: 2025-07-22*
*Status: Complete HTML analysis for implementation*
