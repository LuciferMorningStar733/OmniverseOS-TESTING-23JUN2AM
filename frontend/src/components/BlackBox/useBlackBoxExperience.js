import { useState, useMemo } from "react";
import {
  analyzeTypingSignals,
  getCoreProblemNodes,
  getOmniverseRealities,
  getIntelligenceCollisions,
  getHiddenCenterOfGravity,
  getFutureCollisionModel,
  getOmniverseVerdictPhased,
} from "../../lib/cortexBlackBoxEngine";

export function useBlackBoxExperience() {
  const [inputText, setInputText] = useState("");
  const [phase, setPhase] = useState(0); // 0: Confession, 1: Core Node, 2: Spatial Map, 3: Collision, 4: Hidden Gravity, 5: Future Collision, 6: Verdict
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedReality, setSelectedReality] = useState("optimal");
  const [selectedFutureA, setSelectedFutureA] = useState("statusQuo");
  const [selectedFutureB, setSelectedFutureB] = useState("optimalExec");

  const typingAnalysis = useMemo(() => analyzeTypingSignals(inputText), [inputText]);
  const coreNodes = useMemo(() => getCoreProblemNodes(inputText), [inputText]);
  const realities = useMemo(() => getOmniverseRealities(inputText), [inputText]);
  const agentCollisions = useMemo(() => getIntelligenceCollisions(inputText), [inputText]);
  const hiddenGravity = useMemo(() => getHiddenCenterOfGravity(inputText), [inputText]);
  const futureModel = useMemo(() => getFutureCollisionModel(inputText), [inputText]);
  const verdictData = useMemo(() => getOmniverseVerdictPhased(inputText), [inputText]);

  const submitConfession = () => {
    if (!inputText.trim()) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setPhase(1); // Advance to Core Node Emergence
    }, 1200);
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
