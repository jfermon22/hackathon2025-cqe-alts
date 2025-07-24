# Multi-Function Bedrock Agent POC

A comprehensive test suite for the Multi-Function Product Request Processing Bedrock Agent that handles both search term generation and supplier summary creation.

## Overview

This POC tests a single Bedrock agent that has been configured to handle two distinct functions:
1. **Search Term Generation** - Generates optimized Amazon search terms for product alternatives
2. **Supplier Summary** - Creates professional supplier quote request summaries

The agent determines which function to execute based on the `function` parameter in the input JSON.

## Agent Configuration

- **Agent ID**: CAP1I3RZLN
- **Agent Alias ID**: Q2NBEKJFJT (Updated)
- **Region**: us-west-2
- **Agent ARN**: arn:aws:bedrock:us-west-2:237428333752:agent/CAP1I3RZLN
- **Role ARN**: arn:aws:iam::237428333752:role/service-role/AmazonBedrockExecutionRoleForAgents_BU3R30P11YW

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **AWS CLI** configured with valid, non-expired credentials
3. **IAM Permissions** for `bedrock:InvokeAgent`
4. **Updated Agent** with multi-function capabilities deployed

## Setup

1. Navigate to the POC directory:
   ```bash
   cd bedrock-agent-poc
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Ensure AWS credentials are valid:
   ```bash
   aws sts get-caller-identity
   ```

## Running the Multi-Function Tests

### Method 1: Test Both Functions (Default)
```bash
# Run both search term generation and supplier summary tests
node multi-function-agent-test.js
# or
npm run test-multi
# or
npm test
# or
npm start
```

### Method 2: Test Individual Functions
```bash
# Test only search term generation
node multi-function-agent-test.js --test=search
# or
npm run test-multi-search

# Test only supplier summary
node multi-function-agent-test.js --test=supplier
# or
npm run test-multi-supplier
```

### Method 3: Show Help
```bash
node multi-function-agent-test.js --help
```

## Test Data

### Search Term Generation Test Input
```json
{
  "function": "search_term_generation",
  "original_product": "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
  "description": "binder dividers for office organization",
  "must_have_attributes": ["tabs", "insertable", "clear"],
  "nice_to_have_attributes": ["colorful", "durable"]
}
```

### Supplier Summary Test Input
```json
{
  "function": "supplier_summary",
  "customer_usage_intent": "Need binder dividers for organizing client files in law office, daily use by multiple staff members",
  "original_product": "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
  "item_description": "Professional binder dividers with clear tabs for document organization",
  "description": "Looking for high-quality binder dividers for professional office use",
  "must_have_attributes": [
    "professional appearance",
    "durable construction", 
    "clear labeling",
    "standard 3-ring holes"
  ],
  "nice_to_have_attributes": [
    "reinforced tabs",
    "write-on surface",
    "multiple colors available"
  ]
}
```

## Expected Output Formats

### Search Term Generation Response
```json
{
  "function_executed": "search_term_generation",
  "search_term": "binder dividers tabs insertable clear office",
  "confidence_level": 8,
  "reasoning": "Focused on core must-have attributes with office context",
  "alternative_search_terms": [
    "colorful binder dividers tabs",
    "durable office dividers clear"
  ]
}
```

### Supplier Summary Response
```json
{
  "function_executed": "supplier_summary",
  "summary": "Customer seeks professional binder dividers for law office client file organization...",
  "priority_requirements": [
    "Professional appearance for client-facing use",
    "Durable construction for daily staff use",
    "Clear labeling for easy identification",
    "Standard 3-ring holes for compatibility",
    "Multi-staff durability requirements"
  ],
  "usage_context": "Daily use in law office environment by multiple staff members for client file organization",
  "flexibility_indicators": [
    "Open to alternatives to Avery brand",
    "Reinforced tabs preferred but not required",
    "Multiple colors negotiable"
  ]
}
```

## Test Validation

The test suite automatically validates:

### Search Term Generation
- ✅ Correct function executed (`search_term_generation`)
- ✅ Search term provided (max 10 words)
- ✅ Confidence level (1-10 scale)
- ✅ Reasoning explanation included
- ✅ Alternative search terms (optional)

### Supplier Summary
- ✅ Correct function executed (`supplier_summary`)
- ✅ Summary provided (max 150 words)
- ✅ Priority requirements list (top 5)
- ✅ Usage context explanation (max 50 words)
- ✅ Flexibility indicators (optional)

## Troubleshooting

### Common Issues

1. **Expired Token Error**
   ```
   ExpiredTokenException: The security token included in the request is expired
   ```
   **Solution**: Refresh AWS credentials
   ```bash
   aws configure
   # or refresh your session tokens
   ```

2. **Access Denied Error**
   - Ensure AWS credentials are configured: `aws configure`
   - Verify IAM permissions include `bedrock:InvokeAgent`
   - Check the resource ARN matches your agent

3. **Resource Not Found**
   - Verify the agent ID (CAP1I3RZLN) and alias ID (Q2NBEKJFJT) are correct
   - Ensure the agent is deployed and active in the AWS console
   - Confirm the agent has been updated with multi-function capabilities

4. **Invalid Function Response**
   - Check that the agent has been properly configured with the multi-function instructions
   - Verify the agent is returning the expected JSON format
   - Ensure the `function` parameter is being processed correctly

### AWS Credentials Setup

If you need to refresh AWS credentials:

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-west-2
```

### Required IAM Policy

Your IAM user/role needs the following policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeAgent"
            ],
            "Resource": "arn:aws:bedrock:us-west-2:237428333752:agent/CAP1I3RZLN"
        }
    ]
}
```

## File Structure

```
bedrock-agent-poc/
├── package.json                    # Project configuration with multi-function scripts
├── multi-function-agent-test.js    # Main multi-function test suite
├── bedrock-agent-test.js           # Legacy Hello Agent test
├── amazon-search-agent-test.js     # Legacy search term generator test
├── README.md                       # General documentation
├── README-MULTI-FUNCTION.md        # This file - multi-function specific docs
└── node_modules/                   # Dependencies
```

## Available NPM Scripts

```bash
npm test                    # Run multi-function test (both functions)
npm start                   # Run multi-function test (both functions)
npm run test-multi          # Run multi-function test (both functions)
npm run test-multi-search   # Test search term generation only
npm run test-multi-supplier # Test supplier summary only
npm run test-hello          # Legacy hello agent test
npm run test-search         # Legacy search term generator test
```

## Agent Function Requirements

For the agent to work correctly, it must be configured with instructions that:

1. **Parse the `function` parameter** to determine which operation to perform
2. **Validate required parameters** for each function type
3. **Return structured JSON responses** in the expected format
4. **Include `function_executed` field** for verification
5. **Handle both function types** within a single agent instance

## Next Steps

Once the multi-function agent is working:
- Test with different product types and requirements
- Validate response quality and accuracy
- Integrate with your existing procurement systems
- Add additional function types as needed
- Implement error recovery and retry logic

## Support

If you encounter issues:
1. Check AWS credentials are valid and not expired
2. Verify the agent has been updated with multi-function capabilities
3. Ensure IAM permissions are correctly configured
4. Check AWS CloudWatch logs for additional error details
5. Validate the agent is returning the expected JSON structure
