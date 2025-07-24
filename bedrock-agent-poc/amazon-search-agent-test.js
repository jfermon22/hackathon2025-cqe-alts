import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * Invokes the Amazon Search Term Generator Bedrock agent
 *
 * @param {string} prompt - The formatted input for the agent
 * @param {string} sessionId - An arbitrary identifier for the session
 */
export const invokeSearchTermAgent = async (prompt, sessionId) => {
  console.log(`🚀 Initializing Amazon Search Term Generator Agent...`);
  console.log(`📍 Region: us-west-2`);
  console.log(`🤖 Agent ID: DCL0SSYCQI`);
  console.log(`🔗 Agent Alias ID: SRWUEVLHAX`);
  console.log(`💬 Session ID: ${sessionId}`);
  console.log(`📝 Input Length: ${prompt.length} characters`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  const client = new BedrockAgentRuntimeClient({ region: "us-west-2" });
  
  // Amazon Search Term Generator agent configuration
  const agentId = "DCL0SSYCQI";
  const agentAliasId = "SRWUEVLHAX";

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: prompt,
  });

  try {
    console.log(`📤 Sending request to Search Term Generator Agent...`);
    let completion = "";
    const response = await client.send(command);

    if (response.completion === undefined) {
      throw new Error("Completion is undefined");
    }

    console.log(`📥 Receiving streaming response...`);
    
    for await (const chunkEvent of response.completion) {
      const chunk = chunkEvent.chunk;
      if (chunk && chunk.bytes) {
        console.log(`📦 Received chunk (${chunk.bytes.length} bytes)`);
        const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
        completion += decodedResponse;
        console.log(`🔤 Decoded chunk: "${decodedResponse.substring(0, 100)}${decodedResponse.length > 100 ? '...' : ''}"`);
      }
    }

    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Request completed successfully!`);
    console.log(`📊 Final completion length: ${completion.length} characters`);
    
    return { sessionId: sessionId, completion };
  } catch (err) {
    console.error(`❌ Error occurred:`, err);
    console.error(`🔍 Error details:`, {
      name: err.name,
      message: err.message,
      code: err.code || 'Unknown',
      statusCode: err.$metadata?.httpStatusCode || 'Unknown'
    });
    
    // Provide helpful error messages
    if (err.name === 'AccessDeniedException') {
      console.error(`🔐 Access Denied: Please check your AWS credentials and IAM permissions.`);
      console.error(`📋 Required permissions: bedrock:InvokeAgent`);
      console.error(`🎯 Resource ARN: arn:aws:bedrock:us-west-2:237428333752:agent/DCL0SSYCQI`);
    } else if (err.name === 'ResourceNotFoundException') {
      console.error(`🔍 Resource Not Found: Please verify the agent ID and alias ID are correct.`);
    } else if (err.name === 'ValidationException') {
      console.error(`⚠️ Validation Error: Please check the request parameters.`);
    }
    
    throw err;
  }
};

// Test data configurations
const testData = {
  product: {
    title: "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
    description: "binder dividers",
    mustHaveAttributes: ["tabs"],
    preferredAttributes: ["colorful"]
  }
};

// Format input as JSON
const formatAsJSON = (data) => {
  return JSON.stringify({
    task: "generate_amazon_search_terms",
    product_details: {
      title: data.title,
      description: data.description,
      must_have_attributes: data.mustHaveAttributes,
      preferred_attributes: data.preferredAttributes
    }
  }, null, 2);
};

// Format input as Natural Language
const formatAsNLP = (data) => {
  return `I need to find Amazon search terms for a product. Here are the details:

Product: ${data.title}
Description: ${data.description}
Must have: ${data.mustHaveAttributes.join(', ')}
Would prefer: ${data.preferredAttributes.join(', ')}

Please generate optimized Amazon search terms for finding similar products.`;
};

// Generate a unique session ID
const generateSessionId = () => {
  return `search-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
  const help = args.includes('--help') || args.includes('-h');
  
  return { format: format.toLowerCase(), help };
};

// Display help information
const showHelp = () => {
  console.log(`
🔍 Amazon Search Term Generator Agent Test

Usage: node amazon-search-agent-test.js [options]

Options:
  --format=json    Use JSON input format (default)
  --format=nlp     Use Natural Language input format
  --help, -h       Show this help message

Examples:
  node amazon-search-agent-test.js
  node amazon-search-agent-test.js --format=json
  node amazon-search-agent-test.js --format=nlp
  npm run test-search
  npm run test-search-nlp
`);
};

// Main execution function
const main = async () => {
  const { format, help } = parseArgs();
  
  if (help) {
    showHelp();
    return;
  }

  console.log(`🎯 Amazon Search Term Generator POC Starting...`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`📋 Input Format: ${format.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const sessionId = generateSessionId();
    
    // Format the input based on the selected format
    let formattedInput;
    if (format === 'nlp') {
      formattedInput = formatAsNLP(testData.product);
      console.log(`📝 Using Natural Language format:`);
    } else {
      formattedInput = formatAsJSON(testData.product);
      console.log(`📝 Using JSON format:`);
    }
    
    console.log(`${'─'.repeat(40)}`);
    console.log(formattedInput);
    console.log(`${'─'.repeat(40)}`);
    
    const result = await invokeSearchTermAgent(formattedInput, sessionId);
    
    console.log(`${'='.repeat(60)}`);
    console.log(`🎉 SUCCESS! Search Term Generator Response:`);
    console.log(`${'='.repeat(60)}`);
    console.log(result.completion);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Session Details:`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Input Format: ${format.toUpperCase()}`);
    console.log(`   Response Length: ${result.completion.length} characters`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    // Try to parse and display search terms if they're in a structured format
    try {
      const parsed = JSON.parse(result.completion);
      if (parsed.search_terms || parsed.searchTerms) {
        console.log(`\n🔍 Extracted Search Terms:`);
        const terms = parsed.search_terms || parsed.searchTerms;
        terms.forEach((term, index) => {
          console.log(`   ${index + 1}. "${term}"`);
        });
      }
    } catch (parseError) {
      // Response is not JSON, that's fine - just display as-is
    }
    
  } catch (error) {
    console.log(`${'='.repeat(60)}`);
    console.log(`💥 FAILED! Error Details:`);
    console.log(`${'='.repeat(60)}`);
    console.error(`Error: ${error.message}`);
    
    // Provide troubleshooting guidance
    console.log(`\n🔧 Troubleshooting Tips:`);
    console.log(`1. Ensure AWS credentials are configured (aws configure)`);
    console.log(`2. Verify IAM permissions for bedrock:InvokeAgent`);
    console.log(`3. Check that the Search Term Generator agent is deployed and active`);
    console.log(`4. Confirm the agent ID (DCL0SSYCQI) and alias ID (SRWUEVLHAX) are correct`);
    console.log(`5. Ensure you're in the correct AWS region (us-west-2)`);
    console.log(`6. Try the other input format: --format=${format === 'json' ? 'nlp' : 'json'}`);
    
    process.exit(1);
  }
};

// Call function if run directly
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
