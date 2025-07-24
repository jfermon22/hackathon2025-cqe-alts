# Bedrock Agent POC

A comprehensive proof-of-concept for interacting with multiple AWS Bedrock Agents using the JavaScript SDK.

## Overview

This POC includes two separate agent tests:
1. **Hello Agent** - Sends a "hello" message and receives a conversational response
2. **Amazon Search Term Generator** - Generates optimized Amazon search terms based on product requirements

## Agent Configurations

### Hello Agent (bedrock-agent-test.js)
- **Agent ID**: CAP1I3RZLN
- **Agent Alias ID**: Q2NBEKJFJT
- **Region**: us-west-2
- **Agent ARN**: arn:aws:bedrock:us-west-2:237428333752:agent/CAP1I3RZLN

### Amazon Search Term Generator (amazon-search-agent-test.js)
- **Agent ID**: DCL0SSYCQI
- **Agent Alias ID**: SRWUEVLHAX
- **Region**: us-west-2
- **Agent ARN**: arn:aws:bedrock:us-west-2:237428333752:agent/DCL0SSYCQI
- **Role ARN**: arn:aws:iam::237428333752:role/service-role/AmazonBedrockExecutionRoleForAgents_3950LZ32RGV

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **AWS CLI** configured with appropriate credentials
3. **IAM Permissions** for `bedrock:InvokeAgent`

## Setup

1. Navigate to the POC directory:
   ```bash
   cd bedrock-agent-poc
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the POCs

### Hello Agent

#### Method 1: Direct execution
```bash
node bedrock-agent-test.js
```

#### Method 2: Using npm scripts
```bash
npm run test-hello
# or
npm run test-agent
# or
npm start
```

### Amazon Search Term Generator

#### Method 1: Direct execution
```bash
# Default JSON format
node amazon-search-agent-test.js

# Specify format explicitly
node amazon-search-agent-test.js --format=json
node amazon-search-agent-test.js --format=nlp

# Show help
node amazon-search-agent-test.js --help
```

#### Method 2: Using npm scripts
```bash
# Default JSON format
npm run test-search

# JSON format explicitly
npm run test-search-json

# Natural Language format
npm run test-search-nlp

# Run both agents
npm run test-all
```

### Running in VS Code
1. Open the integrated terminal (`Ctrl+`` or `Cmd+``)
2. Navigate to the `bedrock-agent-poc` directory
3. Run any of the commands above

## Expected Output

When successful, you should see output similar to:
```
🎯 Bedrock Agent POC Starting...
📅 1/24/2025, 8:41:20 AM
==================================================
🚀 Initializing Bedrock Agent Runtime Client...
📍 Region: us-west-2
🤖 Agent ID: CAP1I3RZLN
🔗 Agent Alias ID: Q2NBEKJFJT
💬 Session ID: poc-session-1706112080123-abc123def
📝 Prompt: "hello"
⏰ Timestamp: 2025-01-24T15:41:20.123Z
==================================================
📤 Sending request to Bedrock Agent...
📥 Receiving streaming response...
📦 Received chunk: [chunk data]
🔤 Decoded chunk: "Hello! How can I help you today?"
==================================================
✅ Request completed successfully!
📊 Final completion length: 32 characters
==================================================
🎉 SUCCESS! Agent Response:
==================================================
Hello! How can I help you today?
==================================================
📋 Session Details:
   Session ID: poc-session-1706112080123-abc123def
   Response Length: 32 characters
   Timestamp: 2025-01-24T15:41:20.123Z
```

## Troubleshooting

### Common Issues

1. **Access Denied Error**
   - Ensure AWS credentials are configured: `aws configure`
   - Verify IAM permissions include `bedrock:InvokeAgent`
   - Check the resource ARN matches your agent

2. **Resource Not Found**
   - Verify the agent ID and alias ID are correct
   - Ensure the agent is deployed and active in the AWS console

3. **Validation Error**
   - Check that all required parameters are provided
   - Verify the region is correct (us-west-2)

### AWS Credentials Setup

If you haven't configured AWS credentials:

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

## Amazon Search Term Generator Input Formats

### JSON Format (Default)
```json
{
  "task": "generate_amazon_search_terms",
  "product_details": {
    "title": "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
    "description": "binder dividers",
    "must_have_attributes": ["tabs"],
    "preferred_attributes": ["colorful"]
  }
}
```

### Natural Language Format
```
I need to find Amazon search terms for a product. Here are the details:

Product: Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set
Description: binder dividers
Must have: tabs
Would prefer: colorful

Please generate optimized Amazon search terms for finding similar products.
```

## File Structure

```
bedrock-agent-poc/
├── package.json                    # Project configuration and dependencies
├── bedrock-agent-test.js           # Hello Agent POC
├── amazon-search-agent-test.js     # Amazon Search Term Generator POC
└── README.md                       # This file
```

## Next Steps

Once the POC is working, you can:
- Modify the prompt in the `main()` function
- Add more complex conversation flows
- Integrate with your existing application
- Add session persistence
- Implement error recovery mechanisms

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your AWS credentials and permissions
3. Ensure the Bedrock Agent is active and properly configured
4. Check the AWS CloudWatch logs for additional error details
