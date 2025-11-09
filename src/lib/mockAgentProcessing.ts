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
      sentTo: ["NoveltyChecker Agent", "Coordinator Agent"],
      content: [
        `**Cross-Cutting Insights**:\n1. **Computational-Resolution Paradigm**: The 1500x speedup [Reader] addresses the fundamental trade-off [Reader], but missing accuracy metrics [Critic] prevent full evaluation\n\n2. **Two-Tier Architecture**: Regression + emulation [Reader] suggests hierarchical ML design, though generalization limitations [Critic] raise scalability questions`,
        
        `**Novel Connections**:\n• Energy-Climate Nexus: Faster models → more scenario testing → better policy decisions\n• Physics-Data Integration: Gap in physical consistency [Critic] highlights need for hybrid physics-ML frameworks`,
        
        `**Future Directions**:\n• Develop standardized validation frameworks addressing Critic's concerns\n• Extend methodology to other climate subsystems\n• Integrate uncertainty quantification throughout pipeline`
      ]
    },
    {
      agent: "NoveltyChecker Agent",
      icon: "🔬",
      title: "Research Novelty & Similarity Analysis",
      receivedFrom: ["Reader Agent", "Synthesizer Agent"],
      sentTo: ["Explainer Agent", "Coordinator Agent"],
      content: [
        `**Key Concepts Extracted**:\n• ML-based parameterization for climate models [Reader]\n• Two-stage regression + emulation architecture [Reader]\n• 1500x computational speedup achievement [Synthesizer]\n• Physics-ML integration challenges [Synthesizer]`,
        
        `**Similar Prior Studies** (Semantic Search Results):\n\n1. **"Neural Network Parameterizations for Atmospheric Chemistry" (2019)**\n   - Similarity Score: 0.87/1.0\n   - Overlap: ML emulation of chemistry, computational efficiency\n   - Novel Aspect: Two-stage architecture vs. single-pass approach\n\n2. **"Machine Learning for Climate Model Speedup" (2021)**\n   - Similarity Score: 0.82/1.0\n   - Overlap: Climate model acceleration, regression techniques\n   - Novel Aspect: Specific ozone chemistry focus with validation\n\n3. **"Hybrid Physics-ML for Earth System Models" (2022)**\n   - Similarity Score: 0.75/1.0\n   - Overlap: Physics-data integration discussion\n   - Novel Aspect: Practical implementation vs. theoretical framework`,
        
        `**Novel Contributions Identified**:\n✓ **Empirical Speedup Validation**: 1500x speedup with real-world ozone chemistry case [High Confidence]\n✓ **Hierarchical ML Design**: Two-stage regression→emulation pipeline [Medium-High Confidence]\n✗ **Validation Framework**: Missing metrics noted by Critic reduce novelty claim strength\n⚠ **Generalization Scope**: Limited evidence of applicability beyond ozone chemistry\n\n**Novelty Assessment**: Moderate-High novelty in implementation approach, but conceptual foundations build on established ML-climate literature from 2019-2022.`
      ]
    },
    {
      agent: "Explainer Agent",
      icon: "💡",
      title: "Reasoning & Evidence",
      receivedFrom: ["NoveltyChecker Agent"],
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
      receivedFrom: ["Reader Agent", "Critic Agent", "Synthesizer Agent", "NoveltyChecker Agent", "Explainer Agent"],
      sentTo: [],
      content: [
        `**EXECUTIVE SUMMARY**\nThis paper presents ML approaches to accelerate climate modeling via parameterization, achieving 1500x speedup in ozone chemistry while highlighting critical validation gaps.`,
        
        `**CRITIQUE HIGHLIGHTS**\n✓ Strong empirical demonstration [Reader: 1500x speedup]\n✗ Missing quantitative validation [Critic: no accuracy metrics]\n✗ Generalization scope unclear [Critic: limited to ozone?]\n⚠ Physical consistency not addressed [Synthesizer: physics-ML integration gap]`,
        
        `**RELATED WORK & NOVELTY ANALYSIS**\n\n**Similar Prior Studies**:\n1. Neural Network Parameterizations for Atmospheric Chemistry (2019) - Similarity: 0.87/1.0 [NoveltyChecker]\n   • Shared: ML emulation of chemistry, computational efficiency\n   • Novelty: Two-stage architecture vs. single-pass approach\n\n2. Machine Learning for Climate Model Speedup (2021) - Similarity: 0.82/1.0 [NoveltyChecker]\n   • Shared: Climate model acceleration, regression techniques\n   • Novelty: Specific ozone chemistry focus with validation\n\n3. Hybrid Physics-ML for Earth System Models (2022) - Similarity: 0.75/1.0 [NoveltyChecker]\n   • Shared: Physics-data integration discussion\n   • Novelty: Practical implementation vs. theoretical framework\n\n**Novel Contributions**:\n✓ Empirical Speedup Validation: 1500x speedup with real-world ozone chemistry [NoveltyChecker: High Confidence]\n✓ Hierarchical ML Design: Two-stage regression→emulation pipeline [NoveltyChecker: Medium-High Confidence]\n✗ Validation Framework: Missing metrics reduce novelty claim strength [NoveltyChecker]\n⚠ Generalization Scope: Limited evidence beyond ozone chemistry [NoveltyChecker]\n\n**Overall Novelty**: Moderate-High novelty in implementation approach, builds on established ML-climate literature (2019-2022) [NoveltyChecker]`,
        
        `**SYNTHESIZED INSIGHTS**\n1. Computational-Resolution Trade-off: Breakthrough speed improvements, but incomplete accuracy assessment limits practical deployment\n2. Two-Tier Architecture: Novel hierarchical design [Explainer: High confidence] shows promise for modular climate modeling\n3. Research Positioning: Moderate-high novelty [NoveltyChecker: 0.75-0.87 similarity to prior work], builds on 2019-2022 ML-climate literature\n4. Policy Implications: Faster models enable broader scenario analysis [Synthesizer: Energy-Climate Nexus]`,
        
        `**TRANSPARENT REASONING APPENDIX**\n\n[Claim] ML replaces expensive components\n[Reasoning] Direct empirical case study evidence\n[Confidence] High\n[Citations] Reader: "1500x speedup", "two-stage process"\n\n[Claim] Validation framework insufficient  \n[Reasoning] Critical gaps in metrics and uncertainty\n[Confidence] Medium\n[Citations] Critic: "Missing validation metrics", "uncertainty quantification absent"\n\n**COORDINATOR VERIFICATION**\n✓ All agent outputs integrated\n✓ Source citations preserved throughout\n✓ Critique aligned with summary\n✓ Reasoning transparency maintained\n✓ Report completeness confirmed`
      ]
    }
  ];
};
