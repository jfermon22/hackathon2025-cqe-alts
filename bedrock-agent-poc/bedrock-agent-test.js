import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * @typedef {Object} ResponseBody
 * @property {string} completion
 */

/**
 * Invokes a Bedrock agent to run an inference using the input
 * provided in the request body.
 *
 * @param {string} prompt - The prompt that you want the Agent to complete.
 * @param {string} sessionId - An arbitrary identifier for the session.
 */
export const invokeBedrockAgent = async (prompt, sessionId) => {
  console.log(`🚀 Initializing Bedrock Agent Runtime Client...`);
  console.log(`📍 Region: us-west-2`);
  console.log(`🤖 Agent ID: CAP1I3RZLN`);
  console.log(`🔗 Agent Alias ID: Q2NBEKJFJT`);
  console.log(`💬 Session ID: ${sessionId}`);
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(50)}`);

  const client = new BedrockAgentRuntimeClient({ region: "us-west-2" });
  
  // Your specific agent configuration
  const agentId = "CAP1I3RZLN";
  const agentAliasId = "Q2NBEKJFJT";

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: prompt,
  });

  try {
    console.log(`📤 Sending request to Bedrock Agent...`);
    let completion = "";
    const response = await client.send(command);

    if (response.completion === undefined) {
      throw new Error("Completion is undefined");
    }

    console.log(`📥 Receiving streaming response...`);
    
    for await (const chunkEvent of response.completion) {
      const chunk = chunkEvent.chunk;
      if (chunk && chunk.bytes) {
        console.log(`📦 Received chunk:`, chunk);
        const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
        completion += decodedResponse;
        console.log(`🔤 Decoded chunk: "${decodedResponse}"`);
      }
    }

    console.log(`${'='.repeat(50)}`);
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

// Generate a unique session ID
const generateSessionId = () => {
  return `poc-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Main execution function
const main = async () => {
  console.log(`🎯 Bedrock Agent POC Starting...`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(50)}`);
  
  try {
    const sessionId = generateSessionId();
    const result = await invokeBedrockAgent("hello", sessionId);
    
    console.log(`${'='.repeat(50)}`);
    console.log(`🎉 SUCCESS! Agent Response:`);
    console.log(`${'='.repeat(50)}`);
    console.log(result.completion);
    console.log(`${'='.repeat(50)}`);
    console.log(`📋 Session Details:`);
    console.log(`   Session ID: ${result.sessionId}`);
    console.log(`   Response Length: ${result.completion.length} characters`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.log(`${'='.repeat(50)}`);
    console.log(`💥 FAILED! Error Details:`);
    console.log(`${'='.repeat(50)}`);
    console.error(`Error: ${error.message}`);
    
    // Provide troubleshooting guidance
    console.log(`\n🔧 Troubleshooting Tips:`);
    console.log(`1. Ensure AWS credentials are configured (aws configure)`);
    console.log(`2. Verify IAM permissions for bedrock:InvokeAgent`);
    console.log(`3. Check that the agent is deployed and active`);
    console.log(`4. Confirm the agent ID and alias ID are correct`);
    console.log(`5. Ensure you're in the correct AWS region (us-west-2)`);
    
    process.exit(1);
  }
};

// Call function if run directly
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
