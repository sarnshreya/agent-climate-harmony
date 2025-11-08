// Mock agent processing - simulates the multi-agent workflow
export const processMockDocument = (fileName: string) => {
  return [
    {
      agent: "Reader Agent",
      icon: "📖",
      title: "Document Summary",
      receivedFrom: ["Input Document"],
      sentTo: ["Critic Agent", "Synthesizer Agent", "Coordinator Agent"],
      content: [
        `**Document**: ${fileName}\n\n**Key Findings**:\n• Computational expense vs. resolution trade-off in climate models [Source: "Climate models balance accuracy with computational cost"]\n• ML approaches for parameterization and emulator development [Source: "Machine learning offers solutions for sub-grid processes"]\n• Ozone chemistry parameterization as practical example [Source: "Case study demonstrates 1500x speedup"]\n• Two-stage ML process: regression + emulation [Source: "Hybrid approach combines strengths"]`,
        
        `**Methodology**:\n• Regression techniques for pattern recognition\n• Linear and nonlinear methods comparison\n• Dimension reduction strategies\n• Cross-validation for model reliability [Source: "Standard ML validation practices applied"]`
      ]
    },
    {
      agent: "Critic Agent",
      icon: "🔍",
      title: "Critical Analysis",
      receivedFrom: ["Reader Agent"],
      sentTo: ["Synthesizer Agent", "Coordinator Agent"],
      content: [
        `**Strengths**:\n• Clear problem identification of computational bottlenecks [Source: Reader - "computational expense vs. resolution"]\n• Practical validation with ozone chemistry example [Source: Reader - "1500x speedup demonstrated"]\n• Systematic methodology description [Source: Reader - "two-stage ML process"]`,
        
        `**Limitations & Gaps**:\n• Missing validation metrics and accuracy bounds [Gap: No quantitative performance measures]\n• Limited discussion of generalization to other climate processes [Gap: Scope unclear beyond ozone]\n• Physical consistency concerns not addressed [Gap: How is physics preserved?]\n• Uncertainty quantification absent [Gap: Confidence intervals needed]`
      ]
    },
    {
      agent: "Synthesizer Agent",
      icon: "🧩",
      title: "Synthesized Insights",
      receivedFrom: ["Reader Agent", "Critic Agent"],
      sentTo: ["Explainer Agent", "Coordinator Agent"],
      content: [
        `**Cross-Cutting Insights**:\n1. **Computational-Resolution Paradigm**: The 1500x speedup [Reader] addresses the fundamental trade-off [Reader], but missing accuracy metrics [Critic] prevent full evaluation\n\n2. **Two-Tier Architecture**: Regression + emulation [Reader] suggests hierarchical ML design, though generalization limitations [Critic] raise scalability questions`,
        
        `**Novel Connections**:\n• Energy-Climate Nexus: Faster models → more scenario testing → better policy decisions\n• Physics-Data Integration: Gap in physical consistency [Critic] highlights need for hybrid physics-ML frameworks`,
        
        `**Future Directions**:\n• Develop standardized validation frameworks addressing Critic's concerns\n• Extend methodology to other climate subsystems\n• Integrate uncertainty quantification throughout pipeline`
      ]
    },
    {
      agent: "Explainer Agent",
      icon: "💡",
      title: "Reasoning & Evidence",
      receivedFrom: ["Synthesizer Agent"],
      sentTo: ["Coordinator Agent"],
      content: [
        `**Claim 1**: "ML can replace expensive climate model components"\n**Reasoning**: Ozone case study shows 1500x speedup [Reader] with two-stage process [Reader]\n**Confidence**: High - direct empirical evidence\n**Evidence**: [Reader: "1500x speedup demonstrated"], [Reader: "two-stage ML process"]`,
        
        `**Claim 2**: "Validation framework is insufficient"\n**Reasoning**: Missing accuracy metrics [Critic], no uncertainty quantification [Critic]\n**Confidence**: Medium - absence of evidence, not evidence of absence\n**Evidence**: [Critic: "Missing validation metrics"], [Synthesizer: "addresses fundamental trade-off"]`,
        
        `**Claim 3**: "Hierarchical ML architecture is key innovation"\n**Reasoning**: Two-stage design [Reader] combines regression strengths with emulation efficiency\n**Confidence**: High - explicitly stated methodology\n**Evidence**: [Reader: "Regression + emulation"], [Synthesizer: "Two-Tier Architecture"]`
      ]
    },
    {
      agent: "Coordinator Agent",
      icon: "📊",
      title: "Final Report",
      receivedFrom: ["Reader Agent", "Critic Agent", "Synthesizer Agent", "Explainer Agent"],
      sentTo: [],
      content: [
        `**EXECUTIVE SUMMARY**\nThis paper presents ML approaches to accelerate climate modeling via parameterization, achieving 1500x speedup in ozone chemistry while highlighting critical validation gaps.`,
        
        `**CRITIQUE HIGHLIGHTS**\n✓ Strong empirical demonstration [Reader: 1500x speedup]\n✗ Missing quantitative validation [Critic: no accuracy metrics]\n✗ Generalization scope unclear [Critic: limited to ozone?]\n⚠ Physical consistency not addressed [Synthesizer: physics-ML integration gap]`,
        
        `**SYNTHESIZED INSIGHTS**\n1. Computational-Resolution Trade-off: Breakthrough speed improvements, but incomplete accuracy assessment limits practical deployment\n2. Two-Tier Architecture: Novel hierarchical design [Explainer: High confidence] shows promise for modular climate modeling\n3. Policy Implications: Faster models enable broader scenario analysis [Synthesizer: Energy-Climate Nexus]`,
        
        `**TRANSPARENT REASONING APPENDIX**\n\n[Claim] ML replaces expensive components\n[Reasoning] Direct empirical case study evidence\n[Confidence] High\n[Citations] Reader: "1500x speedup", "two-stage process"\n\n[Claim] Validation framework insufficient  \n[Reasoning] Critical gaps in metrics and uncertainty\n[Confidence] Medium\n[Citations] Critic: "Missing validation metrics", "uncertainty quantification absent"\n\n**COORDINATOR VERIFICATION**\n✓ All agent outputs integrated\n✓ Source citations preserved throughout\n✓ Critique aligned with summary\n✓ Reasoning transparency maintained\n✓ Report completeness confirmed`
      ]
    }
  ];
};
