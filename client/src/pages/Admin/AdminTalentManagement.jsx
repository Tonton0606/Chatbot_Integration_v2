import { useEffect, useMemo, useState } from "react";

import {
  SkillsAndSuccessionGrid,
  TalentIntelligencePanel,
  TalentKPICards,
  TalentManagementError,
  TalentManagementHeader,
  TalentManagementLoading,
  TalentPoolTable,
  TalentScoreSettings,
} from "../../components/admin/layout/Admin_TalentManagement_Components.jsx";

import {
  getTalentManagementData,
  updateTalentScoreConfig,
  persistTalentScores,
} from "../../services/human_resources/talent_management";


function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function labelsFromRules(score, rules) {
  return {
    readiness:
      score >= Number(rules.readyNow || 90)
        ? "Ready now"
        : score >= Number(rules.readySoon || 75)
          ? "Ready in 6 months"
          : "Needs development",
    potential:
      score >= Number(rules.potentialHigh || 90)
        ? "High"
        : score >= Number(rules.potentialMedium || 75)
          ? "Medium"
          : "Low",
    risk:
      score >= Number(rules.riskLow || 85)
        ? "Low"
        : score >= Number(rules.riskMedium || 70)
          ? "Medium"
          : "High",
  };
}

function weightedScore(item, config) {
  const signals = [
    ["tasks", item.taskScore],
    ["attendance", item.attendanceScore],
    ["performance", item.performanceScore],
    ["engagement", item.engagementScore],
  ];

  const active = signals.filter(
    ([key]) => config?.[key]?.enabled && Number(config?.[key]?.weight || 0) > 0
  );

  const totalWeight = active.reduce(
    (sum, [key]) => sum + Number(config[key].weight || 0),
    0
  );

  if (!totalWeight) return 0;

  return clampScore(
    active.reduce(
      (sum, [key, score]) => sum + Number(score || 0) * Number(config[key].weight || 0),
      0
    ) / totalWeight
  );
}

export default function AdminTalentManagement() {
  const [data, setData] = useState(null);
  const [scoringConfig, setScoringConfig] = useState(null);
  const [rules, setRules] = useState({
    readyNow: 90,
    readySoon: 75,
    potentialHigh: 90,
    potentialMedium: 75,
    riskLow: 85,
    riskMedium: 70,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTalentManagement();
  }, []);

  async function loadTalentManagement() {
    try {
      setLoading(true);
      setError("");

      const result = await getTalentManagementData();
      setData(result);
      setScoringConfig(result.scoringConfig);
    } catch (err) {
      console.error("Talent management load error:", err);
      setError(err.message || "Failed to load talent management.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfiguration() {
    const total = Object.values(scoringConfig || {}).reduce(
      (sum, item) => sum + (item.enabled ? Number(item.weight || 0) : 0),
      0
    );

    if (total !== 100) {
      setSaveMessage("Talent score weights must total exactly 100%.");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");

      await updateTalentScoreConfig({
        scoringConfig,
        rules,
      });

      await persistTalentScores(displayedData?.talentPool || []);

      setSaveMessage("Configuration and talent scores saved successfully.");
      await loadTalentManagement();
    } catch (err) {
      console.error("Save talent configuration error:", err);
      setSaveMessage(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  const displayedData = useMemo(() => {
    if (!data || !scoringConfig) return data;

    const talentPool = (data.talentPool || []).map((item) => {
      const finalScore = weightedScore(item, scoringConfig);
      const labels = labelsFromRules(finalScore, rules);

      return {
        ...item,
        talentScore: finalScore,
        readiness: labels.readiness,
        potential: labels.potential,
        risk: labels.risk,
      };
    });

    return {
      ...data,
      talentPool,
      summary: {
        ...data.summary,
        highPotential: talentPool.filter((item) => item.potential === "High").length,
        promotionReady: talentPool.filter((item) => item.readiness === "Ready now").length,
        averageTalentScore: talentPool.length
          ? Math.round(
              talentPool.reduce((sum, item) => sum + item.talentScore, 0) /
                talentPool.length
            )
          : 0,
      },
    };
  }, [data, scoringConfig, rules]);

  return (
    <div className="space-y-6">
      <TalentManagementHeader onRefresh={loadTalentManagement} />

      {loading && <TalentManagementLoading />}

      {!loading && error && (
        <TalentManagementError message={error} onRetry={loadTalentManagement} />
      )}

      {!loading && !error && data && (
        <>
          <TalentIntelligencePanel config={scoringConfig || data.scoringConfig} />
          <TalentKPICards summary={displayedData.summary} />
          <TalentScoreSettings
            config={scoringConfig || data.scoringConfig}
            rules={rules}
            onConfigChange={setScoringConfig}
            onRulesChange={setRules}
            onSave={handleSaveConfiguration}
            saving={saving}
            saveMessage={saveMessage}
          />
          <TalentPoolTable talentPool={displayedData.talentPool} />
          <SkillsAndSuccessionGrid
            skillMatrix={displayedData.skillMatrix}
            successionPlans={displayedData.successionPlans}
            careerPaths={displayedData.careerPaths}
          />
        </>
      )}
    </div>
  );
}
