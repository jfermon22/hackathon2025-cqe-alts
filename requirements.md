# Requirements Document - CQE Alternate Selection Enhancement

## Problem Statement

Custom Quotes Engine (CQE) is a platform on Amazon.com that enables business buyers to request quotes for large one-time purchases over $10K. Currently, the system has significant conversion rate issues due to poor alternate product matching and lack of customer-supplier communication.

### Current Process
1. Business customer submits RFQ with primary ASIN and quantity
2. CQE retrieves suggested alternates from internal service
3. RFQ presented to supplier with primary ASIN + suggested alternates
4. Supplier responds with quotes

### Key Problems
- **Low conversion rates**: 
  - Primary ASIN quotes: ~5% conversion
  - Amazon-suggested alternates: <1% conversion
- **Poor alternate matching**: Amazon's suggested alternates are often unsuitable
- **No customer input**: Customers cannot specify alternate preferences or requirements
- **No customer feedback loop**: No way for customers to provide feedback on suggested alternates
- **Supplier context gap**: Suppliers don't know if customers will accept alternates or what criteria matter

### Example Scenario
Customer requests Apple MacBook → Amazon suggests MacBook Pro alternate → Customer may actually need budget laptops for school with specific specs (256GB storage, 8GB RAM) → Supplier has Dell/Acer options that would work but assumes customer only wants Apple → Opportunity lost

## Proposed Solution

### Customer-Facing Enhancement (Primary Focus)
Add an "Add Alternates" button to the left of the existing "Add Item" button in the CQE request interface. This will launch an LLM-powered conversational modal that guides customers through alternate selection.

### User Experience Flow

#### 1. Entry Point
- **Location**: Next to "Add Item" button on the quote request page
- **Trigger**: "Add Alternates" button click
- **Interface**: Modal overlay with chat interface

#### 2. Conversational Script Flow
1. **Willingness Check**: "Would you be willing to accept alternate ASINs for this request?"
   - If No: Close modal, continue with primary ASIN only
   - If Yes: Proceed to requirements gathering

2. **Requirements Gathering**: "What are the key attributes a suitable alternate needs to meet to be suitable for you?"
   - LLM processes natural language response
   - Extracts key specifications, price constraints, use case context

3. **Search & Selection**: 
   - LLM generates optimized search terms
   - Search Amazon catalog for potential alternates
   - LLM evaluates and ranks up to 8 best matches
   - Present alternates to customer for selection

4. **Manual Addition Option**:
   - Text input box for manual ASIN entry
   - Regex validation for ASIN format
   - "Add Alt" button to include customer-specified ASINs

5. **Summary Generation**:
   - LLM summarizes the conversation and requirements
   - Customer reviews and approves summary
   - Summary attached to RFQ for supplier context

#### 3. Supplier Experience Enhancement
- Suppliers receive the conversation summary along with selected alternates
- Provides context on customer requirements and willingness to accept alternates
- Existing supplier alternate suggestion functionality remains unchanged

## Technical Requirements

### Implementation Approach
- **Platform**: Greasemonkey userscript for rapid prototyping
- **Integration**: Add-on to existing CQE interface
- **LLM Service**: Strands SDK (Python library) - direct integration from frontend
- **Backend APIs**: CQE ProcessBuyerRequest API
- **Search**: Internal Amazon search APIs

### Key Components
1. **UI Enhancement**: Add "Add Alternates" button to existing interface
2. **Modal Interface**: Chat-based conversation flow
3. **LLM Integration**: Strands SDK for conversation processing and alternate evaluation
4. **Amazon Search Integration**: Internal APIs for product name, description, and specifications
5. **ASIN Validation**: Regex validation `[0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9}` for manual ASIN entry
6. **Summary Generation**: Conversation summarization for supplier context
7. **CQE Integration**: ProcessBuyerRequest API for submitting enhanced requests

### Technical Specifications
- **ASIN Format**: 10 characters, validated with regex `[0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9}`
- **Data Storage**: Session-based only, no persistent storage required
- **Product Data**: Name, description, specifications from internal Amazon APIs
- **Request Enhancement**: Conversation summary sent via ProcessBuyerRequest API

## Success Criteria

### Primary Goals
- **Working Prototype**: Functional Greasemonkey script demonstrating the complete flow
- **User Experience**: Intuitive conversational interface for alternate selection
- **Integration**: Seamless integration with existing CQE workflow

### Success Metrics (Future)
- Increase conversion rate for alternate-based quotes from <1% to target TBD
- Improve customer satisfaction with alternate suggestions
- Reduce supplier confusion and improve quote relevance

## Stakeholders
- **Primary**: Business customers requesting quotes
- **Secondary**: Suppliers responding to RFQs
- **Internal**: CQE platform team

## Constraints
- Must integrate with existing CQE platform without breaking current functionality
- Greasemonkey implementation for rapid prototyping
- Leverage existing CQE APIs and data sources
- Maintain customer data privacy and security standards

---
*Created: 2025-07-22*
*Status: Detailed requirements - ready for specification*
