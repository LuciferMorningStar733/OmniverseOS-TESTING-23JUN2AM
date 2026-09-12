import { useState, useMemo } from "react";
import {
  analyzeTypingSignals,
  getCoreProblemNodes,
  getOmniverseRealities,
  getIntelligenceCollisions,
  getHiddenCenterOfGravity,
  getFutureCollisionModel,
  getOmniverseVerdictPhased,
  runLiveBlackBoxAnalysis,
} from "../../lib/cortexBlackBoxEngine";

export function useBlackBoxExperience() {
  const [inputText, setInputText] = useState("");
  const [phase, setPhase] = useState(0); // 0: Confession, 1: Core Node, 2: Spatial Map, 3: Collision, 4: Hidden Gravity, 5: Future Collision, 6: Verdict
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedReality, setSelectedReality] = useState("optimal");
  const [selectedFutureA, setSelectedFutureA] = useState("statusQuo");
  const [selectedFutureB, setSelectedFutureB] = useState("optimalExec");
  const [dynamicAiData, setDynamicAiData] = useState(null);

  const typingAnalysis = useMemo(() => analyzeTypingSignals(inputText), [inputText]);
  const coreNodes = useMemo(() => {
    if (dynamicAiData?.orbitingNodes?.length) {
      return {
        coreTitle: dynamicAiData.coreTitle || inputText.slice(0, 45),
        orbitingNodes: dynamicAiData.orbitingNodes,
      };
    }
    return getCoreProblemNodes(inputText);
  }, [inputText, dynamicAiData]);

  const realities = useMemo(() => {
    if (dynamicAiData?.realities?.length) {
      return { realities: dynamicAiData.realities };
    }
    return getOmniverseRealities(inputText);
  }, [inputText, dynamicAiData]);

  const agentCollisions = useMemo(() => {
    if (dynamicAiData?.collisions?.length) {
      return { exchanges: dynamicAiData.collisions };
    }
    return getIntelligenceCollisions(inputText);
  }, [inputText, dynamicAiData]);

  const hiddenGravity = useMemo(() => {
    if (dynamicAiData?.hiddenCenterOfGravity) {
      const hc = dynamicAiData.hiddenCenterOfGravity;
      return {
        statedQuestion: hc.statedQuestion || inputText.slice(0, 60),
        hiddenInsight: hc.unspokenTruth || hc.actualTension,
        whyItMatters: hc.inflectionPoint || hc.evidenceAnchor,
      };
    }
    return getHiddenCenterOfGravity(inputText);
  }, [inputText, dynamicAiData]);

  const futureModel = useMemo(() => getFutureCollisionModel(inputText), [inputText]);
  const verdictData = useMemo(() => getOmniverseVerdictPhased(inputText), [inputText]);

  const submitConfession = async () => {
    if (!inputText.trim() || isTransitioning) return;
    setIsTransitioning(true);
    try {
      const res = await runLiveBlackBoxAnalysis(inputText, { source: "TheBlackBoxExperience" });
      if (res) {
        setDynamicAiData(res);
      }
    } catch (err) {
      console.warn("Live Black Box AI call failed:", err);
    } finally {
      setIsTransitioning(false);
      setPhase(1); // Advance to Core Node Emergence
    }
  };


  const nextPhase = () => {
    setPhase((prev) => Math.min(prev + 1, 6));
  };

  const prevPhase = () => {
    setPhase((prev) => Math.max(prev - 1, 0));
  };

  const resetExperience = () => {
    setPhase(0);
    setInputText("");
  };

  return {
    inputText,
    setInputText,
    phase,
    setPhase,
    isTransitioning,
    submitConfession,
    nextPhase,
    prevPhase,
    resetExperience,
    selectedReality,
    setSelectedReality,
    selectedFutureA,
    setSelectedFutureA,
    selectedFutureB,
    setSelectedFutureB,
    typingAnalysis,
    coreNodes,
    realities,
    agentCollisions,
    hiddenGravity,
    futureModel,
    verdictData,
  };
}
