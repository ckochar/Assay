import React, { useMemo, useState } from "react";
import {
  RECOMMENDATION,
  ROUTING_THRESHOLDS,
  canRecordReadyDisposition,
  computeRecommendation,
  validateOverride,
} from "./domain/mortgageQc.js";
import { DEMO_REVIEWS, PROFILE_REGISTRY } from "./data/mortgageDemo.js";

const C = {
  bg: "#f5f7f6", panel: "#ffffff", ink: "#14211d", sub: "#60706a", line: "#dfe6e2",
  teal: "#0d6259", tealSoft