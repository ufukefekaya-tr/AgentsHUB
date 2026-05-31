import { MindsetParser } from './src/memory/parser.js';

async function verify() {
  const prompt = await MindsetParser.synthesize("TestAjani", {});
  console.log("=== SYNTHESIZED SYSTEM PROMPT FOR TESTAJANI ===");
  console.log(prompt);
  console.log("=================================================");
  console.log("Total Characters:", prompt.length);
  console.log("Token Estimate (~ chars / 4):", Math.ceil(prompt.length / 4));
}
verify();
