import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * Invokes the Multi-Function Product Request Processing Bedrock agent
 *
 * @param {string} prompt - The formatted input for the agent
 * @param {string} sessionId - An arbitrary identifier for the session
 */
export const invokeMultiFunctionAgent = async (prompt, sessionId) => {
  console.log(`🚀 Initializing Multi-Function Product Request Processing Agent...`);
  console.log(`📍 Region: us-west-2`);
  console.log(`🤖 Agent ID: CAP1I3RZLN`);
  console.log(`🔗 Agent Alias ID: HPTZBY3CYT`);
  console.log(`💬 Session ID: ${sessionId}`);
  console.log(`📝 Input Length: ${prompt.length} characters`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}`);

  const client = new BedrockAgentRuntimeClient({ region: "us-west-2" });
  
  // Updated Multi-Function agent configuration
  const agentId = "CAP1I3RZLN";
  const agentAliasId = "HPTZBY3CYT";

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: prompt,
  });

  try {
    console.log(`📤 Sending request to Multi-Function Agent...`);
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

    console.log(`${'='.repeat(70)}`);
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
      console.error(`🎯 Resource ARN: arn:aws:bedrock:us-west-2:237428333752:agent/CAP1I3RZLN`);
    } else if (err.name === 'ResourceNotFoundException') {
      console.error(`🔍 Resource Not Found: Please verify the agent ID and alias ID are correct.`);
    } else if (err.name === 'ValidationException') {
      console.error(`⚠️ Validation Error: Please check the request parameters.`);
    }
    
    throw err;
  }
};

// Test data configurations for both functions
const testData = {
  searchTermGeneration: {
    function: "search_term_generation",
    original_product: "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
    description: "binder dividers for office organization",
    must_have_attributes: ["tabs", "insertable", "clear"],
    nice_to_have_attributes: ["colorful", "durable"]
  },
  
  supplierSummary: {
    function: "supplier_summary",
    customer_usage_intent: "Need binder dividers for organizing client files in law office, daily use by multiple staff members",
    original_product: "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
    item_description: "Professional binder dividers with clear tabs for document organization",
    description: "Looking for high-quality binder dividers for professional office use",
    must_have_attributes: ["professional appearance", "durable construction", "clear labeling", "standard 3-ring holes"],
    nice_to_have_attributes: ["reinforced tabs", "write-on surface", "multiple colors available"]
  }
};

// Generate a unique session ID
const generateSessionId = (functionType) => {
  return `multi-func-${functionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const testType = args.find(arg => arg.startsWith('--test='))?.split('=')[1] || 'both';
  const help = args.includes('--help') || args.includes('-h');
  
  return { testType: testType.toLowerCase(), help };
};

// Display help information
const showHelp = () => {
  console.log(`
🔧 Multi-Function Product Request Processing Agent Test

Usage: node multi-function-agent-test.js [options]

Options:
  --test=both      Test both functions (default)
  --test=search    Test search term generation only
  --test=supplier  Test supplier summary only
  --help, -h       Show this help message

Examples:
  node multi-function-agent-test.js
  node multi-function-agent-test.js --test=search
  node multi-function-agent-test.js --test=supplier
  npm run test-multi
  npm run test-multi-search
  npm run test-multi-supplier
`);
};

// Test search term generation function
const testSearchTermGeneration = async () => {
  console.log(`\n🔍 TESTING SEARCH TERM GENERATION FUNCTION`);
  console.log(`${'='.repeat(70)}`);
  
  const sessionId = generateSessionId('search');
  const input = JSON.stringify(testData.searchTermGeneration, null, 2);
  
  console.log(`📝 Input for Search Term Generation:`);
  console.log(`${'─'.repeat(50)}`);
  console.log(input);
  console.log(`${'─'.repeat(50)}`);
  
  try {
    const result = await invokeMultiFunctionAgent(input, sessionId);
    
    console.log(`🎉 SUCCESS! Search Term Generation Response:`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📤 RAW INPUT SENT TO AGENT:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(input);
    console.log(`${'─'.repeat(40)}`);
    console.log(`📥 RAW OUTPUT FROM AGENT:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(result.completion);
    console.log(`${'─'.repeat(40)}`);
    console.log(`${'='.repeat(70)}`);
    
    // Try to parse and validate the response
    try {
      const parsed = JSON.parse(result.completion);
      console.log(`✅ Response Validation:`);
      console.log(`   Function Executed: ${parsed.function_executed || 'NOT SPECIFIED'}`);
      console.log(`   Search Term: ${parsed.search_term || 'NOT PROVIDED'}`);
      console.log(`   Confidence Level: ${parsed.confidence_level || 'NOT PROVIDED'}`);
      console.log(`   Has Reasoning: ${parsed.reasoning ? 'YES' : 'NO'}`);
      console.log(`   Alternative Terms: ${parsed.alternative_search_terms ? parsed.alternative_search_terms.length : 0}`);
      
      if (parsed.function_executed === 'search_term_generation') {
        console.log(`✅ Correct function executed!`);
      } else {
        console.log(`⚠️ Warning: Expected 'search_term_generation', got '${parsed.function_executed}'`);
      }
      
      // Extract and display the search term separately
      if (parsed.search_term) {
        console.log(`\n🎯 EXTRACTED SEARCH TERM:`);
        console.log(`${'─'.repeat(40)}`);
        console.log(`"${parsed.search_term}"`);
        console.log(`${'─'.repeat(40)}`);
      }
    } catch (parseError) {
      console.log(`⚠️ Warning: Response is not valid JSON - Parse Error: ${parseError.message}`);
    }
    
    return { success: true, result };
  } catch (error) {
    console.log(`❌ Search Term Generation Test Failed: ${error.message}`);
    return { success: false, error };
  }
};

// Test supplier summary function
const testSupplierSummary = async () => {
  console.log(`\n📋 TESTING SUPPLIER SUMMARY FUNCTION`);
  console.log(`${'='.repeat(70)}`);
  
  const sessionId = generateSessionId('supplier');
  const input = JSON.stringify(testData.supplierSummary, null, 2);
  
  console.log(`📝 Input for Supplier Summary:`);
  console.log(`${'─'.repeat(50)}`);
  console.log(input);
  console.log(`${'─'.repeat(50)}`);
  
  try {
    const result = await invokeMultiFunctionAgent(input, sessionId);
    
    console.log(`🎉 SUCCESS! Supplier Summary Response:`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📤 RAW INPUT SENT TO AGENT:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(input);
    console.log(`${'─'.repeat(40)}`);
    console.log(`📥 RAW OUTPUT FROM AGENT:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(result.completion);
    console.log(`${'─'.repeat(40)}`);
    console.log(`${'='.repeat(70)}`);
    
    // Try to parse and validate the response
    try {
      const parsed = JSON.parse(result.completion);
      console.log(`✅ Response Validation:`);
      console.log(`   Function Executed: ${parsed.function_executed || 'NOT SPECIFIED'}`);
      console.log(`   Summary Length: ${parsed.summary ? parsed.summary.length : 0} characters`);
      console.log(`   Priority Requirements: ${parsed.priority_requirements ? parsed.priority_requirements.length : 0}`);
      console.log(`   Has Usage Context: ${parsed.usage_context ? 'YES' : 'NO'}`);
      console.log(`   Flexibility Indicators: ${parsed.flexibility_indicators ? parsed.flexibility_indicators.length : 0}`);
      
      if (parsed.function_executed === 'supplier_summary') {
        console.log(`✅ Correct function executed!`);
      } else {
        console.log(`⚠️ Warning: Expected 'supplier_summary', got '${parsed.function_executed}'`);
      }
      
      if (parsed.summary && parsed.summary.length > 150 * 6) { // Rough word count check
        console.log(`⚠️ Warning: Summary may exceed 150 word limit`);
      }
      
      // Extract and display the summary separately
      if (parsed.summary) {
        console.log(`\n📄 EXTRACTED SUMMARY:`);
        console.log(`${'─'.repeat(40)}`);
        console.log(parsed.summary);
        console.log(`${'─'.repeat(40)}`);
      }
    } catch (parseError) {
      console.log(`⚠️ Warning: Response is not valid JSON - Parse Error: ${parseError.message}`);
    }
    
    return { success: true, result };
  } catch (error) {
    console.log(`❌ Supplier Summary Test Failed: ${error.message}`);
    return { success: false, error };
  }
};

// Main execution function
const main = async () => {
  const { testType, help } = parseArgs();
  
  if (help) {
    showHelp();
    return;
  }

  console.log(`🎯 Multi-Function Product Request Processing Agent Test Starting...`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🧪 Test Type: ${testType.toUpperCase()}`);
  console.log(`${'='.repeat(70)}`);
  
  const results = {
    searchTerm: null,
    supplierSummary: null,
    overall: { passed: 0, failed: 0 }
  };
  
  try {
    // Run tests based on the specified type
    if (testType === 'both' || testType === 'search') {
      results.searchTerm = await testSearchTermGeneration();
      if (results.searchTerm.success) {
        results.overall.passed++;
      } else {
        results.overall.failed++;
      }
    }
    
    if (testType === 'both' || testType === 'supplier') {
      results.supplierSummary = await testSupplierSummary();
      if (results.supplierSummary.success) {
        results.overall.passed++;
      } else {
        results.overall.failed++;
      }
    }
    
    // Display final results
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 FINAL TEST RESULTS`);
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Tests Passed: ${results.overall.passed}`);
    console.log(`❌ Tests Failed: ${results.overall.failed}`);
    console.log(`📈 Success Rate: ${results.overall.passed + results.overall.failed > 0 ? 
      Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100) : 0}%`);
    
    if (results.overall.failed === 0) {
      console.log(`🎉 All tests passed! Multi-function agent is working correctly.`);
    } else {
      console.log(`⚠️ Some tests failed. Please check the error details above.`);
    }
    
    console.log(`⏰ Test completed at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.log(`${'='.repeat(70)}`);
    console.log(`💥 CRITICAL ERROR! Test Suite Failed:`);
    console.log(`${'='.repeat(70)}`);
    console.error(`Error: ${error.message}`);
    
    // Provide troubleshooting guidance
    console.log(`\n🔧 Troubleshooting Tips:`);
    console.log(`1. Ensure AWS credentials are configured (aws configure)`);
    console.log(`2. Verify IAM permissions for bedrock:InvokeAgent`);
    console.log(`3. Check that the Multi-Function agent is deployed and active`);
    console.log(`4. Confirm the agent ID (CAP1I3RZLN) and alias ID (Q2NBEKJFJT) are correct`);
    console.log(`5. Ensure you're in the correct AWS region (us-west-2)`);
    console.log(`6. Verify the agent has been updated with multi-function capabilities`);
    
    process.exit(1);
  }
};

// Call function if run directly
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
