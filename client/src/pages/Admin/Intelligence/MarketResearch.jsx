import React, { useState } from "react";
import { Star, Eye, Target, LayoutGrid, Trash2, List, ChevronDown, Sparkles, Calendar, Tag, Hash, FileText } from "lucide-react";
import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import MarketResearchDashboard from "./MarketResearchDashboard.jsx";
import {
  generateMarketResearch,
} from "../../../services/intelligence";
import {
  INDUSTRIES,
  REGIONS,
  BUSINESS_TYPES,
  TARGET_AUDIENCES,
} from "../../../services/intelligence/marketResearchService.js";

const COMPETITOR_FOCUS = [
  "Market Leader",
  "Direct Competitors",
  "Emerging Startups",
  "Local Competitors",
  "International Competitors"
];

const RESEARCH_OBJECTIVES = [
  "Market Size Analysis",
  "Competitor Analysis",
  "Customer Insights",
  "Pricing Strategy",
  "Industry Trends",
  "SWOT Analysis",
  "Go-to-Market Strategy",
  "Investment Opportunity"
];

const TIME_HORIZONS = [
  "Current Market (Today)",
  "Next 6 Months",
  "Next 1 Year",
  "Next 3 Years",
  "Next 5 Years"
];

const AI_RESEARCH_DEPTHS = [
  "Quick Overview",
  "Standard Analysis",
  "Deep Research",
  "Executive Report"
];


const MARKET_GENERATION_STEPS = [
  "Understanding your input",
  "Analyzing market data",
  "Identifying trends",
  "Generating insights",
  "Finalizing report",
];

const MIN_MARKET_GENERATION_MS = 4200;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getMarketIndustry(form) {
  if (form.industry === "Others") {
    return String(form.customIndustry || "").trim();
  }
  return form.industry;
}

function MarketAiAnimation({ isGenerating = false }) {
  return (
    <div
      className={`market-ai-visual ${isGenerating ? "is-generating" : "is-idle"}`}
      aria-hidden="true"
    >
      <div className="market-ai-wave market-ai-wave-left" />
      <div className="market-ai-wave market-ai-wave-right" />
      <div className="market-ai-tile market-ai-tile-chart">
        <span />
        <span />
        <span />
      </div>
      <div className="market-ai-tile market-ai-tile-pie">
        <span />
      </div>
      <div className="market-ai-tile market-ai-tile-search" />
      <div className="market-ai-tile market-ai-tile-report">
        <span />
        <span />
      </div>
      <div className="market-ai-orbit market-ai-orbit-one">
        <span />
      </div>
      <div className="market-ai-orbit market-ai-orbit-two">
        <span />
      </div>
      <div className="market-ai-core">
        <div className="market-ai-face">
          <span />
          <span />
        </div>
      </div>
      <div className="market-ai-base" />
      <div className="market-ai-scanline" />
    </div>
  );
}

function MarketResearchMotionState({ isGenerating }) {
  return (
    <div
      className={`market-research-motion-state ${
        isGenerating ? "is-generating" : "is-idle"
      }`}
    >
      <div className="market-motion-scene">
        <div className="market-motion-visual-column">
          <MarketAiAnimation isGenerating={isGenerating} />
        </div>

        <div className="market-motion-content-column">
          <div className="market-motion-copy">
            <div className="market-motion-spark">AI</div>
            <div>
              <div className="intel-section-title">
                {isGenerating
                  ? "AI is generating your market research..."
                  : "Ready to generate market intelligence"}
              </div>
              <div className="intel-section-subtitle">
                {isGenerating
                  ? "Our AI is analyzing your inputs, market signals, competitor positioning, and opportunity patterns."
                  : "Fill out the research brief above, then generate a report with market size, competitors, trends, and recommended actions."}
              </div>
            </div>
          </div>

          <div className="market-ai-stage-rail">
            {MARKET_GENERATION_STEPS.map((step, index) => (
              <div key={step} className="market-ai-stage">
                <span>{index + 1}</span>
                <div>{step}</div>
              </div>
            ))}
          </div>

          <div className="market-ai-progress">
            <div className="market-ai-progress-track">
              <div className="market-ai-progress-fill" />
            </div>
            <span className="market-ai-progress-value">
              {isGenerating ? (
                <>
                  <span>0%</span>
                  <span>18%</span>
                  <span>42%</span>
                  <span>67%</span>
                  <span>100%</span>
                </>
              ) : (
                "Ready"
              )}
            </span>
          </div>

          <div className="market-ai-status-line">
            <span />
            {isGenerating
              ? "Analyzing industry data and competitor insights..."
              : "Waiting for your research request..."}
          </div>
        </div>
      </div>

      <div className="market-ai-note">
        This may take 15-60 seconds depending on the depth of analysis.
      </div>
    </div>
  );
}

const PDF_COLORS = {
  navy: [15, 23, 42],
  panel: [248, 250, 252],
  cyan: [34, 211, 238],
  gold: [201, 168, 76],
  text: [15, 23, 42],
  muted: [100, 116, 139],
  border: [218, 226, 235],
  white: [255, 255, 255],
};

function sanitizeFilePart(value) {
  return String(value || "Market_Research")
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "Market_Research";
}

function getReportDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addReportFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Generated by Hermes Admin AI Market Research", 14, pageHeight - 8);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 8, {
    align: "right",
  });
}

function createPdfWriter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;
  let pageNumber = 1;

  function ensureSpace(height = 16) {
    if (y + height <= pageHeight - 22) return;
    addReportFooter(doc, pageNumber);
    doc.addPage();
    pageNumber += 1;
    y = 18;
  }

  function sectionTitle(title) {
    y += 6; // Add breathing room above every section
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 34, y);
    y += 8; // Breathing room below the line
  }

  function paragraph(text, options = {}) {
    const value = String(text || "").trim();
    if (!value) return;

    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size || 10);
    if (Array.isArray(options.color)) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(...PDF_COLORS.text);
    }
    const lines = doc.splitTextToSize(value, options.maxWidth || maxWidth);
    ensureSpace(lines.length * 4.4 + 3);
    doc.text(lines, margin + (options.indent || 0), y);
    y += lines.length * 4.4 + (options.after ?? 3);
  }

  function keyValue(label, value) {
    if (!value) return;
    const labelWidth = Math.min(46, Math.max(24, doc.getTextWidth(`${label}:`) + 3));
    const lines = doc.splitTextToSize(String(value), maxWidth - labelWidth);
    ensureSpace(lines.length * 4.4 + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(5.5, lines.length * 4.4 + 1.5);
  }

  function infoBlock(label, value) {
    if (!value) return;
    const labelLines = doc.splitTextToSize(String(label), 34);
    const valueLines = doc.splitTextToSize(String(value), maxWidth - 44);
    const blockHeight = Math.max(labelLines.length, valueLines.length) * 4.2 + 5;

    ensureSpace(blockHeight + 2);
    doc.setFillColor(...PDF_COLORS.panel);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.roundedRect(margin, y - 4, maxWidth, blockHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelLines, margin + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(valueLines, margin + 42, y);
    y += blockHeight + 2;
  }

  function bullet(text) {
    const value = String(text || "").trim();
    if (!value) return;

    const lines = doc.splitTextToSize(value, maxWidth - 8);
    ensureSpace(lines.length * 4.4 + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("-", margin, y);
    doc.text(lines, margin + 6, y);
    y += lines.length * 4.4 + 2;
  }

  function drawKPICards(cards) {
    ensureSpace(30);
    const cardWidth = (maxWidth - (cards.length - 1) * 6) / cards.length;
    
    cards.forEach((card, i) => {
      const x = margin + (cardWidth + 6) * i;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...(card.color || [15, 23, 42]));
      doc.setLineWidth(0.5);
      doc.rect(x, y, cardWidth, 24, "FD");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(card.label).toUpperCase(), x + cardWidth/2, y + 8, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(...(card.color || [15, 23, 42]));
      doc.text(String(card.value), x + cardWidth/2, y + 17, { align: "center" });
    });
    
    y += 30;
  }

  function tableRow(columns, widths, isHeader = false, rowIndex = 0, headerColor = PDF_COLORS.navy) {
    const lineGroups = columns.map((column, index) =>
      doc.splitTextToSize(String(column || ""), widths[index] - 4)
    );
    const rowHeight = Math.max(...lineGroups.map((lines) => lines.length * 4)) + 6;

    ensureSpace(rowHeight + 2);
    const rowX = margin;
    const rowY = y;
    if (isHeader) {
      doc.setFillColor(...headerColor);
    } else if (rowIndex % 2 === 0) {
      doc.setFillColor(...PDF_COLORS.panel);
    } else {
      doc.setFillColor(...PDF_COLORS.white);
    }
    doc.rect(rowX, rowY - 4, maxWidth, rowHeight, "F");
    doc.setDrawColor(...PDF_COLORS.border);
    doc.rect(rowX, rowY - 4, maxWidth, rowHeight, "S");
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(...(isHeader ? PDF_COLORS.white : PDF_COLORS.text));

    let x = rowX + 2;
    lineGroups.forEach((lines, index) => {
      doc.text(lines, x, rowY);
      x += widths[index];
    });

    y += rowHeight;
  }

  function finish() {
    addReportFooter(doc, pageNumber);
  }

  return {
    bullet,
    drawKPICards,
    ensureSpace,
    finish,
    infoBlock,
    keyValue,
    margin,
    maxWidth,
    paragraph,
    sectionTitle,
    tableRow,
    getY: () => y,
    setY: (nextY) => {
      y = nextY;
    },
  };
}

export default function MarketResearch() {
  const [form, setForm] = useState({
    businessName: "",
    businessWebsite: "",
    industry: "",
    customIndustry: "",
    region: "Philippines",
    businessType: "SMB (Small & Medium Business)",
    targetAudience: "Business owners & decision-makers (B2B)",
    competitorFocus: "",
    researchObjective: "",
    timeHorizon: "",
    aiResearchDepth: "",
    additionalContext: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketResearch, setMarketResearch] = useState(null);
  const [marketResultTab, setMarketResultTab] = useState("overview");
  const [marketExporting, setMarketExporting] = useState(false);
  const [mainTab, setMainTab] = useState("research");
  const [savedResearches, setSavedResearches] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [archiveModalConfig, setArchiveModalConfig] = useState({ show: false, id: null });
  const [restoreModalConfig, setRestoreModalConfig] = useState({ show: false, id: null });
  const [deleteModalConfig, setDeleteModalConfig] = useState({ show: false, id: null });

  React.useEffect(() => {
    const saved = localStorage.getItem("saved_market_researches");
    if (saved) {
      try {
        setSavedResearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved researches", e);
      }
    }
  }, []);

  const handleConfirmArchive = () => {
    if (!archiveModalConfig.id) return;
    const updated = savedResearches.map(item => 
      item.id === archiveModalConfig.id ? { ...item, isArchived: true } : item
    );
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    setArchiveModalConfig({ show: false, id: null });
  };

  const handleConfirmRestore = () => {
    if (!restoreModalConfig.id) return;
    const updated = savedResearches.map(item => 
      item.id === restoreModalConfig.id ? { ...item, isArchived: false } : item
    );
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    setRestoreModalConfig({ show: false, id: null });
  };

  const handleConfirmDelete = () => {
    if (!deleteModalConfig.id) return;
    const updated = savedResearches.filter(item => item.id !== deleteModalConfig.id);
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    setDeleteModalConfig({ show: false, id: null });
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    const updated = savedResearches.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
  };


  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "industry" && value !== "Others") {
      setForm(f => ({ ...f, customIndustry: "" }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.industry) {
      setError("Please select an industry.");
      return;
    }
    if (!form.businessName) {
      setError("Please enter a Business / Company Name.");
      return;
    }
    setLoading(true);
    setError(null);
    setMarketResearch(null);

    try {
      const requestForm = {
        ...form,
        industry: getMarketIndustry(form),
        focus: form.competitorFocus || "",
        researchGoal: form.researchObjective || "",
        notes: form.additionalContext || "",
      };
      
      const [research] = await Promise.all([
        generateMarketResearch(requestForm),
        wait(MIN_MARKET_GENERATION_MS),
      ]);
      setMarketResearch(research);
      setMarketResultTab("overview");
    } catch (err) {
      setError(err.message || "Market research failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportMarketResearch(item = null) {
    const researchObj = (item && item.id) ? item.marketResearch : marketResearch;
    const formObj = (item && item.id) ? item.form : form;
    if (!researchObj || marketExporting) return;

    // Check if the parameter is actually an event object from a click (which is the default when onClick={handleExportMarketResearch})
    const actualResearchObj = (item && item.nativeEvent) ? marketResearch : researchObj;
    const actualFormObj = (item && item.nativeEvent) ? form : formObj;

    setMarketExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const writer = createPdfWriter(doc);
      const reportDate = getReportDate();
      const productName = actualFormObj.businessName || "Product";
      const reportIndustry = getMarketIndustry(actualFormObj);
      const fileName = `${sanitizeFilePart(productName)}_${reportDate}_Market_Research.pdf`;

      const {
        executiveSummary = {},
        marketOverview = {},
        competitors = [],
        trends = [],
        opportunities = [],
        risks = [],
        recommendations = [],
        swot = {},
        references = []
      } = actualResearchObj.reportData || {};

      doc.setFillColor(...PDF_COLORS.navy);
      doc.rect(0, 0, 210, 34, "F");
      doc.setFillColor(...PDF_COLORS.gold);
      doc.rect(0, 0, 210, 2.5, "F");
      doc.setFillColor(...PDF_COLORS.gold);
      doc.rect(14, 30.5, 44, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...PDF_COLORS.white);
      doc.text("AI Market Research Report", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(202, 213, 226);
      doc.text(`Prepared for ${productName}`, 14, 22);
      doc.text(`Generated ${reportDate}`, 14, 28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_COLORS.gold);
      doc.text("Hermes Admin Intelligence", 194, 22, { align: "right" });
      writer.setY(44);

      writer.sectionTitle("Research Brief");
      writer.keyValue("Business / Brand", productName);
      writer.keyValue("Website", form.businessWebsite);
      writer.keyValue("Industry", reportIndustry);
      writer.keyValue("Target Region", form.region);
      writer.keyValue("Research Goal", form.researchObjective);
      writer.keyValue("Competitor Focus", form.competitorFocus);
      writer.keyValue("Time Horizon", form.timeHorizon);
      writer.keyValue("Depth", form.aiResearchDepth);

      writer.sectionTitle("Executive Summary");
      if (executiveSummary.summary) {
        writer.paragraph(executiveSummary.summary);
      }
      writer.drawKPICards([
        { label: "Confidence", value: `${executiveSummary.confidenceScore || 0}/100`, color: [0, 184, 217] },
        { label: "Viability", value: `${executiveSummary.marketViabilityScore || 0}/100`, color: [34, 197, 94] },
        { label: "Competition", value: `${executiveSummary.competitionScore || 0}/100`, color: [245, 158, 11] },
        { label: "Growth", value: `${executiveSummary.growthPotentialScore || 0}/100`, color: [168, 85, 247] }
      ]);

      writer.sectionTitle("Market Overview");
      writer.tableRow(["Metric", "Analysis"], [40, 138], true, 0, [59, 130, 246]); // Blue
      writer.tableRow(["Market Size", marketOverview.marketSize || "N/A"], [40, 138], false, 0);
      writer.tableRow(["CAGR", marketOverview.cagr || "N/A"], [40, 138], false, 1);
      writer.tableRow(["Growth Outlook", marketOverview.growthOutlook || "N/A"], [40, 138], false, 2);
      writer.tableRow(["Market Maturity", marketOverview.marketMaturity || "N/A"], [40, 138], false, 3);

      if (swot) {
        writer.sectionTitle("SWOT Analysis");

        const boxWidth = 89;
        const gap = 4;
        
        const quadrants = [
          { key: "strengths", title: "STRENGTHS", x: 14, color: [46, 204, 113], bg: [240, 252, 245] },
          { key: "weaknesses", title: "WEAKNESSES", x: 14 + boxWidth + gap, color: [231, 76, 60], bg: [253, 240, 238] },
          { key: "opportunities", title: "OPPORTUNITIES", x: 14, color: [52, 152, 219], bg: [240, 248, 255] },
          { key: "threats", title: "THREATS", x: 14 + boxWidth + gap, color: [243, 156, 18], bg: [254, 248, 238] }
        ];

        quadrants.forEach(q => {
          let items = Array.isArray(swot[q.key]) ? swot[q.key] : 
                      (typeof swot[q.key] === "string" ? swot[q.key].split(/\\n|,/).map(s=>s.trim()).filter(Boolean) : []);
          q.items = items;
          
          let contentHeight = 12;
          items.forEach(item => {
             const lines = doc.splitTextToSize(`• ${item}`, boxWidth - 8);
             contentHeight += lines.length * 4;
          });
          q.reqHeight = Math.max(contentHeight + 4, 30);
        });

        const row0Height = Math.max(quadrants[0].reqHeight, quadrants[1].reqHeight);
        const row1Height = Math.max(quadrants[2].reqHeight, quadrants[3].reqHeight);

        writer.ensureSpace(row0Height + row1Height + gap + 10);
        const gridStartY = writer.getY();

        quadrants[0].y = gridStartY;
        quadrants[1].y = gridStartY;
        quadrants[0].height = row0Height;
        quadrants[1].height = row0Height;

        quadrants[2].y = gridStartY + row0Height + gap;
        quadrants[3].y = gridStartY + row0Height + gap;
        quadrants[2].height = row1Height;
        quadrants[3].height = row1Height;

        quadrants.forEach(q => {
          doc.setFillColor(...q.bg);
          doc.setDrawColor(...q.color);
          doc.setLineWidth(0.5);
          doc.rect(q.x, q.y, boxWidth, q.height, "FD");
          
          doc.setFillColor(...q.color);
          doc.rect(q.x, q.y, boxWidth, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text(q.title, q.x + 4, q.y + 5.5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);
          
          let currentY = q.y + 13;
          q.items.forEach(item => {
             const lines = doc.splitTextToSize(`• ${item}`, boxWidth - 8);
             doc.text(lines, q.x + 4, currentY);
             currentY += lines.length * 4;
          });
        });
        
        writer.setY(gridStartY + row0Height + gap + row1Height + 10);
      }

      if (competitors.length > 0) {
        writer.sectionTitle("Competitor Analysis");
        writer.tableRow(
          ["Brand", "Positioning", "Threat", "Strengths", "Weaknesses"],
          [30, 36, 18, 45, 45],
          true, 0, [44, 62, 80] // Navy
        );
        competitors.forEach((competitor, index) => {
          const s = Array.isArray(competitor.strengths) ? competitor.strengths.join(", ") : (typeof competitor.strengths === "string" ? competitor.strengths : "");
          const w = Array.isArray(competitor.weaknesses) ? competitor.weaknesses.join(", ") : (typeof competitor.weaknesses === "string" ? competitor.weaknesses : "");
          writer.tableRow(
            [
              competitor.name || competitor.brand || "Unknown",
              competitor.positioning || "N/A",
              competitor.threatLevel || "Medium",
              s,
              w
            ],
            [30, 36, 18, 45, 45],
            false,
            index
          );
        });
      }

      if (trends.length > 0) {
        writer.sectionTitle("Market Trends");
        if (typeof trends[0] === "object" && trends[0] !== null) {
          writer.tableRow(["Trend", "Description", "Growth", "Impact"], [40, 88, 25, 25], true, 0, [142, 68, 173]); // Purple
          trends.forEach((trend, index) => {
            writer.tableRow(
              [trend.title || "Trend", trend.description || "N/A", trend.growthIndicator || "N/A", trend.impactLevel || "Medium"],
              [40, 88, 25, 25], false, index
            );
          });
        } else {
          trends.forEach((trend) => writer.bullet(trend));
        }
      }

      if (opportunities.length > 0) {
        writer.sectionTitle("Opportunity Matrix");
        if (typeof opportunities[0] === "object" && opportunities[0] !== null) {
          writer.tableRow(["Opportunity", "Impact", "Difficulty", "ROI"], [103, 25, 25, 25], true, 0, [41, 128, 185]); // Blue
          opportunities.forEach((opp, index) => {
            writer.tableRow(
              [opp.opportunity || "Opportunity", opp.impact || "Medium", opp.difficulty || opp.effort || "Medium", opp.roi || "Medium"],
              [103, 25, 25, 25], false, index
            );
          });
        } else {
          opportunities.forEach((opp) => writer.bullet(opp));
        }
      }

      if (risks.length > 0) {
        writer.sectionTitle("Risk Dashboard");
        if (typeof risks[0] === "object" && risks[0] !== null) {
          writer.tableRow(["Risk", "Severity", "Probability", "Mitigation"], [40, 20, 20, 98], true, 0, [192, 57, 43]); // Red
          risks.forEach((risk, index) => {
            writer.tableRow(
              [risk.title || risk.risk || "Risk", risk.severity || "Medium", risk.probability || "Medium", risk.mitigation || "N/A"],
              [40, 20, 20, 98], false, index
            );
          });
        } else {
          risks.forEach((risk) => writer.bullet(risk));
        }
      }

      if (recommendations.length > 0) {
        writer.sectionTitle("Recommended Next Steps");
        if (typeof recommendations[0] === "object" && recommendations[0] !== null) {
          writer.tableRow(["Recommendation", "Priority", "Impact", "Effort"], [103, 25, 25, 25], true, 0, [39, 174, 96]); // Green
          recommendations.forEach((rec, index) => {
            writer.tableRow(
              [rec.recommendation || rec.title || "Recommendation", rec.priority || "Medium", rec.impact || "Medium", rec.effort || "Medium"],
              [103, 25, 25, 25], false, index
            );
          });
        } else {
          recommendations.forEach((rec) => writer.bullet(rec));
        }
      }

      if (Array.isArray(references) && references.length > 0) {
        writer.sectionTitle("References & Citations");
        writer.paragraph("The insights in this report are supported by the following simulated or real-world data sources (APA format):", { size: 9, after: 6, color: [100, 116, 139] });
        references.forEach(ref => {
          writer.bullet(ref);
        });
      }

      writer.finish();
      doc.save(fileName);
    } catch (err) {
      setError(err.message || "Unable to export market research PDF.");
    } finally {
      setMarketExporting(false);
    }
  }

  

  const getSummaryText = (item) => {
    const mr = item.marketResearch;
    if (!mr) return "No summary available.";

    // 1. Check sections.overview
    if (mr.sections?.overview?.[0]?.detail) {
      const detail = mr.sections.overview[0].detail;
      if (detail && detail !== "No summary provided." && detail !== "No data.") {
        return detail;
      }
    }

    // 2. Check reportData.executiveSummary.summary
    if (mr.reportData?.executiveSummary?.summary) {
      return mr.reportData.executiveSummary.summary;
    }

    // 3. Check reportData.executiveSummary if it's a string
    if (typeof mr.reportData?.executiveSummary === 'string' && mr.reportData.executiveSummary) {
      return mr.reportData.executiveSummary;
    }

    // 4. Check reportData.executive_summary
    if (mr.reportData?.executive_summary) {
      const es = mr.reportData.executive_summary;
      if (typeof es === 'string') return es;
      if (typeof es === 'object' && es.summary) return es.summary;
    }

    // 5. Try stringifying any executiveSummary object values
    if (mr.reportData?.executiveSummary && typeof mr.reportData.executiveSummary === 'object') {
      const vals = Object.values(mr.reportData.executiveSummary).filter(v => typeof v === 'string' && v.length > 20);
      if (vals.length > 0) return vals[0];
    }

    return "No summary available.";
  };

  const getIndustryConfig = (industry) => {
    const ind = industry || "";
    if (ind.includes("Tech") || ind.includes("SaaS") || ind.includes("Software")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>, color: "#3498db", bg: "rgba(52,152,219,0.1)" };
    if (ind.includes("Retail") || ind.includes("E-commerce")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>, color: "#e74c3c", bg: "rgba(231,76,60,0.1)" };
    if (ind.includes("Health") || ind.includes("Wellness") || ind.includes("Pharma")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>, color: "#2ecc71", bg: "rgba(46,204,113,0.1)" };
    if (ind.includes("Finance") || ind.includes("Fintech") || ind.includes("Banking")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: "#f1c40f", bg: "rgba(241,196,15,0.1)" };
    if (ind.includes("Real Estate") || ind.includes("Construction")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>, color: "#9b59b6", bg: "rgba(155,89,182,0.1)" };
    if (ind.includes("Food") || ind.includes("Beverage") || ind.includes("Restaurant")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>, color: "#e67e22", bg: "rgba(230,126,34,0.1)" };
    if (ind.includes("Education") || ind.includes("Training")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>, color: "#34495e", bg: "rgba(52,73,94,0.1)" };
    if (ind.includes("Manufacturing") || ind.includes("Distribution")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: "#7f8c8d", bg: "rgba(127,140,141,0.1)" };
    if (ind.includes("Logistics") || ind.includes("Supply Chain")) return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>, color: "#1abc9c", bg: "rgba(26,188,156,0.1)" };

    return { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>, color: "var(--brand-cyan)", bg: "rgba(0, 242, 254, 0.1)" };
  };


  const handleSaveResearch = () => {
    if (!marketResearch) return;
    const newSave = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      form: { ...form },
      marketResearch: { ...marketResearch },
      isFavorite: false
    };
    const updated = [newSave, ...savedResearches];
    setSavedResearches(updated);
    localStorage.setItem("saved_market_researches", JSON.stringify(updated));
    setShowSaveModal(true);
  };

  const sanitizeFilePart = (name) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const getReportDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const getMarketIndustry = (f) => f.industry === 'Others' ? f.customIndustry : f.industry;

  const handleExportDocx = (item = null) => {
    // Check if the parameter is an event (from standard onClick without arrow func)
    const researchObj = (item && item.id) ? item.marketResearch : marketResearch;
    const formObj = (item && item.id) ? item.form : form;
    if (!researchObj || !researchObj.reportData) return;
    
    const actualResearchObj = (item && item.nativeEvent) ? marketResearch : researchObj;
    const actualFormObj = (item && item.nativeEvent) ? form : formObj;
    
    const productName = actualFormObj.businessName || 'Product';
    const fileName = sanitizeFilePart(productName) + '_' + getReportDate() + '_Market_Research.doc';
    
    const rd = actualResearchObj.reportData || {};
    const {
      executiveSummary = {},
      marketOverview = {},
      competitors = [],
      trends = [],
      opportunities = [],
      risks = [],
      recommendations = [],
      swot = null,
      references = []
    } = rd;

    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Market Research</title></head>
      <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>
        <h1 style='color: #0f172a; text-align: center;'>AI Market Research Report: ${productName}</h1>
        <p style='text-align: center; color: #64748b;'><strong>Industry:</strong> ${getMarketIndustry(actualFormObj)} | <strong>Date:</strong> ${getReportDate()}</p>
        <hr style='border: 1px solid #cbd5e1;'/>
        
        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Research Brief</h2>
        <ul>
          <li><strong>Business / Brand:</strong> ${productName}</li>
          <li><strong>Website:</strong> ${actualFormObj.businessWebsite || 'N/A'}</li>
          <li><strong>Target Region:</strong> ${actualFormObj.region || 'N/A'}</li>
          <li><strong>Research Goal:</strong> ${actualFormObj.researchObjective || 'N/A'}</li>
          <li><strong>Competitor Focus:</strong> ${actualFormObj.competitorFocus || 'N/A'}</li>
          <li><strong>Time Horizon:</strong> ${actualFormObj.timeHorizon || 'N/A'}</li>
          <li><strong>Depth:</strong> ${actualFormObj.aiResearchDepth || 'N/A'}</li>
        </ul>

        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Executive Summary</h2>
        <p>${executiveSummary.summary || executiveSummary || 'No executive summary provided.'}</p>
    `;

    if (marketOverview && (marketOverview.marketSize || marketOverview.cagr)) {
      htmlContent += `
        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Market Overview</h2>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f1f5f9;"><th>Metric</th><th>Analysis</th></tr>
          <tr><td><strong>Market Size</strong></td><td>${marketOverview.marketSize || 'N/A'}</td></tr>
          <tr><td><strong>CAGR</strong></td><td>${marketOverview.cagr || 'N/A'}</td></tr>
          <tr><td><strong>Growth Outlook</strong></td><td>${marketOverview.growthOutlook || 'N/A'}</td></tr>
          <tr><td><strong>Market Maturity</strong></td><td>${marketOverview.marketMaturity || 'N/A'}</td></tr>
        </table>
      `;
    }

    if (swot) {
      const strengths = Array.isArray(swot.strengths) ? swot.strengths : (typeof swot.strengths === 'string' ? swot.strengths.split(',') : []);
      const weaknesses = Array.isArray(swot.weaknesses) ? swot.weaknesses : (typeof swot.weaknesses === 'string' ? swot.weaknesses.split(',') : []);
      const opps = Array.isArray(swot.opportunities) ? swot.opportunities : (typeof swot.opportunities === 'string' ? swot.opportunities.split(',') : []);
      const thr = Array.isArray(swot.threats) ? swot.threats : (typeof swot.threats === 'string' ? swot.threats.split(',') : []);

      htmlContent += `
        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>SWOT Analysis</h2>
        <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="width: 50%; vertical-align: top; background-color: #f0fdf4;">
              <h3 style="color: #166534; margin-top: 0;">Strengths</h3>
              <ul style="margin: 0; padding-left: 20px;">${strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            </td>
            <td style="width: 50%; vertical-align: top; background-color: #fef2f2;">
              <h3 style="color: #991b1b; margin-top: 0;">Weaknesses</h3>
              <ul style="margin: 0; padding-left: 20px;">${weaknesses.map(s => `<li>${s}</li>`).join('')}</ul>
            </td>
          </tr>
          <tr>
            <td style="width: 50%; vertical-align: top; background-color: #f0f9ff;">
              <h3 style="color: #075985; margin-top: 0;">Opportunities</h3>
              <ul style="margin: 0; padding-left: 20px;">${opps.map(s => `<li>${s}</li>`).join('')}</ul>
            </td>
            <td style="width: 50%; vertical-align: top; background-color: #fffbeb;">
              <h3 style="color: #92400e; margin-top: 0;">Threats</h3>
              <ul style="margin: 0; padding-left: 20px;">${thr.map(s => `<li>${s}</li>`).join('')}</ul>
            </td>
          </tr>
        </table>
      `;
    }

    if (competitors && competitors.length > 0) {
      htmlContent += `
        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Competitor Analysis</h2>
        <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f1f5f9;"><th>Brand</th><th>Positioning</th><th>Threat</th><th>Strengths</th><th>Weaknesses</th></tr>
          ${competitors.map(c => `
            <tr>
              <td><strong>${c.name || c.brand || 'Unknown'}</strong></td>
              <td>${c.positioning || 'N/A'}</td>
              <td>${c.threatLevel || 'Medium'}</td>
              <td>${Array.isArray(c.strengths) ? c.strengths.join(', ') : (c.strengths || '')}</td>
              <td>${Array.isArray(c.weaknesses) ? c.weaknesses.join(', ') : (c.weaknesses || '')}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (trends && trends.length > 0) {
      htmlContent += `<h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Market Trends</h2>`;
      if (typeof trends[0] === 'object') {
        htmlContent += `
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f1f5f9;"><th>Trend</th><th>Description</th><th>Growth</th><th>Impact</th></tr>
            ${trends.map(t => `
              <tr>
                <td><strong>${t.title || 'Trend'}</strong></td>
                <td>${t.description || 'N/A'}</td>
                <td>${t.growthIndicator || 'N/A'}</td>
                <td>${t.impactLevel || 'Medium'}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        htmlContent += `<ul>${trends.map(t => `<li>${t}</li>`).join('')}</ul>`;
      }
    }

    if (opportunities && opportunities.length > 0) {
      htmlContent += `<h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Opportunity Matrix</h2>`;
      if (typeof opportunities[0] === 'object') {
        htmlContent += `
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f1f5f9;"><th>Opportunity</th><th>Impact</th><th>Difficulty / Effort</th><th>ROI</th></tr>
            ${opportunities.map(o => `
              <tr>
                <td><strong>${o.opportunity || 'Opportunity'}</strong></td>
                <td>${o.impact || 'Medium'}</td>
                <td>${o.difficulty || o.effort || 'Medium'}</td>
                <td>${o.roi || 'Medium'}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        htmlContent += `<ul>${opportunities.map(o => `<li>${o}</li>`).join('')}</ul>`;
      }
    }

    if (risks && risks.length > 0) {
      htmlContent += `<h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Risk Dashboard</h2>`;
      if (typeof risks[0] === 'object') {
        htmlContent += `
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f1f5f9;"><th>Risk</th><th>Severity</th><th>Probability</th><th>Mitigation</th></tr>
            ${risks.map(r => `
              <tr>
                <td><strong>${r.title || r.risk || 'Risk'}</strong></td>
                <td>${r.severity || 'Medium'}</td>
                <td>${r.probability || 'Medium'}</td>
                <td>${r.mitigation || 'N/A'}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        htmlContent += `<ul>${risks.map(r => `<li>${r}</li>`).join('')}</ul>`;
      }
    }

    if (recommendations && recommendations.length > 0) {
      htmlContent += `<h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>Recommended Next Steps</h2>`;
      if (typeof recommendations[0] === 'object') {
        htmlContent += `
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f1f5f9;"><th>Recommendation</th><th>Priority</th><th>Impact</th><th>Effort</th></tr>
            ${recommendations.map(rec => `
              <tr>
                <td><strong>${rec.recommendation || rec.title || 'Recommendation'}</strong></td>
                <td>${rec.priority || 'Medium'}</td>
                <td>${rec.impact || 'Medium'}</td>
                <td>${rec.effort || 'Medium'}</td>
              </tr>
            `).join('')}
          </table>
        `;
      } else {
        htmlContent += `<ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>`;
      }
    }

    if (references && references.length > 0) {
      htmlContent += `
        <h2 style='color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>References & Citations</h2>
        <p style="color: #64748b; font-size: 14px;">The insights in this report are supported by the following simulated or real-world data sources:</p>
        <ul>${references.map(ref => `<li>${ref}</li>`).join('')}</ul>
      `;
    }

    htmlContent += `
        <br/><hr style='border: 1px solid #cbd5e1;'/>
        <p style='text-align: center; color: #94a3b8; font-size: 12px;'>Generated by Hermes Admin AI Market Research</p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const marketAnalytics = marketResearch?.analytics || {};
      const opportunityMap = marketAnalytics.opportunityMap || [];
  const roadmap = marketAnalytics.roadmap || [];
  const assumptions = marketAnalytics.assumptions || [];

  return (
    <div className="crm-page intelligence-page">
      <style dangerouslySetInnerHTML={{ __html: "@keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }"
      }} />
      {showSaveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(46,204,113,0.1)', color: '#2ecc71', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={24} fill="currentColor" />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 'bold' }}>Research Saved!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>
              Your market research has been securely saved to your workspace. You can access it anytime from the <strong>Saved Researches</strong> tab.
            </p>
            <button onClick={() => setShowSaveModal(false)} style={{ marginTop: '8px', width: '100%', padding: '12px', background: 'var(--brand-cyan)', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Awesome
            </button>
          </div>
        </div>
      )}
      <IntelligenceHeader
        title="AI Market Research"
        subtitle="Provide details about your business and research goals. AI will generate market insights in seconds."
        icon="🔍"
        showFilters={false}
        showAI={false}
      />

      {/* SAVED RESEARCHES TABS */}
      <div className="intel-page-body" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <button onClick={() => setMainTab('research')} style={{ background: 'transparent', border: 'none', color: mainTab === 'research' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'research' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'research' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Current Research
          </button>
          <button onClick={() => setMainTab('saved')} style={{ background: 'transparent', border: 'none', color: mainTab === 'saved' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'saved' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'saved' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Saved Researches
          </button>
          <button onClick={() => setMainTab('favorites')} style={{ background: 'transparent', border: 'none', color: mainTab === 'favorites' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'favorites' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'favorites' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Favorites
          </button>
          <button onClick={() => setMainTab('archived')} style={{ background: 'transparent', border: 'none', color: mainTab === 'archived' ? 'var(--brand-cyan)' : 'var(--text-muted)', borderBottom: mainTab === 'archived' ? '2px solid var(--brand-cyan)' : '2px solid transparent', paddingBottom: '12px', fontWeight: mainTab === 'archived' ? 'bold' : 'normal', fontSize: '15px', cursor: 'pointer' }}>
            Archived
          </button>
        </div>

        {mainTab === 'research' && (
          <div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: "24px 28px", margin: "24px 0 0" }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>1</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Business Profile</h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tell us about the business you want to research.</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business / Company Name *</label>
                      <input className="intel-input" style={{ width: "100%" }} type="text" name="businessName" value={form.businessName} onChange={handleChange} placeholder="e.g. ExponifyPH" required />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business Website (Optional)</label>
                      <input className="intel-input" style={{ width: "100%" }} type="url" name="businessWebsite" value={form.businessWebsite} onChange={handleChange} placeholder="https://yourbusiness.com" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Industry *</label>
                      <select className="intel-select" style={{ width: "100%" }} name="industry" value={form.industry} onChange={handleChange} required>
                        <option value="">Select Industry</option>
                        {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Region</label>
                      <select className="intel-select" style={{ width: "100%" }} name="region" value={form.region} onChange={handleChange}>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Business Type</label>
                      <select className="intel-select" style={{ width: "100%" }} name="businessType" value={form.businessType} onChange={handleChange}>
                        {BUSINESS_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  {form.industry === "Others" && (
                    <div style={{ marginTop: 16 }}>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Custom Industry</label>
                      <input className="intel-input" style={{ width: "100%" }} type="text" name="customIndustry" value={form.customIndustry} onChange={handleChange} placeholder="e.g. Pet care, Esports" />
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>2</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>Research Goals</h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Define the focus and scope of your research.</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Target Audience</label>
                      <select className="intel-select" style={{ width: "100%" }} name="targetAudience" value={form.targetAudience} onChange={handleChange}>
                        {TARGET_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Competitor Focus</label>
                      <select className="intel-select" style={{ width: "100%" }} name="competitorFocus" value={form.competitorFocus} onChange={handleChange}>
                        <option value="">Select Focus</option>
                        {COMPETITOR_FOCUS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Research Objective</label>
                      <select className="intel-select" style={{ width: "100%" }} name="researchObjective" value={form.researchObjective} onChange={handleChange}>
                        <option value="">Select Objective</option>
                        {RESEARCH_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Time Horizon</label>
                      <select className="intel-select" style={{ width: "100%" }} name="timeHorizon" value={form.timeHorizon} onChange={handleChange}>
                        <option value="">Select Horizon</option>
                        {TIME_HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                        AI Research Depth <Star size={10} fill="#f1c40f" color="#f1c40f" style={{ display: 'inline', marginLeft: 4 }} />
                      </label>
                      <select className="intel-select" style={{ width: "100%" }} name="aiResearchDepth" value={form.aiResearchDepth} onChange={handleChange}>
                        <option value="">Select Depth</option>
                        {AI_RESEARCH_DEPTHS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Additional Context (optional)</label>
                    <textarea className="intel-input" style={{ width: "100%", padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }} name="additionalContext" value={form.additionalContext} onChange={handleChange} placeholder="e.g. We are launching a new product in Q3. Focus on pricing and distribution channels." rows={3} />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{form.additionalContext?.length || 0}/2000</div>
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>3</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>AI Configuration</h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Configure the depth and context of your research.</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {[
                      { name: 'Quick Overview', desc: 'Get a high-level summary in 30-60 seconds.', icon: <Eye size={18} color="var(--text-muted)" /> },
                      { name: 'Standard Analysis', desc: 'Balanced insights with detailed analysis.', icon: <Target size={18} color="#9b59b6" /> },
                      { name: 'Deep Research', desc: 'In-depth, comprehensive market research.', icon: <Star size={18} fill="var(--brand-cyan)" color="var(--brand-cyan)" /> },
                      { name: 'Executive Report', desc: 'Executive-ready report with recommendations.', icon: <LayoutGrid size={18} color="#e056fd" /> }
                    ].map(opt => {
                      const isSelected = form.aiResearchDepth === opt.name;
                      return (
                        <div key={opt.name} onClick={() => setForm(f => ({ ...f, aiResearchDepth: opt.name }))} style={{ 
                          background: 'var(--bg-surface)', border: isSelected ? '1px solid var(--brand-cyan)' : '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' 
                        }} className="intel-card-hover">
                          {isSelected && (
                            <div style={{ position: 'absolute', top: -8, right: -8, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-cyan)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            {opt.icon}
                            <h4 style={{ margin: 0, fontSize: '14px', color: isSelected ? 'var(--brand-cyan)' : 'var(--text-primary)', fontWeight: '600' }}>{opt.name}</h4>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div style={{ background: "#e74c3c18", border: "1px solid #e74c3c44", borderRadius: 8, padding: "10px 14px", color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
                  <button className="intel-btn intel-btn-ai market-generate-btn" type="submit" disabled={loading} style={{ padding: "12px 32px", background: loading ? "var(--border-color)" : "linear-gradient(135deg, #1abc9c 0%, #2980b9 100%)", color: loading ? "var(--text-muted)" : "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                    <Sparkles size={18} /> {loading ? "Generating..." : "Generate AI Research"}
                  </button>
                  {(() => {
                      let estTime = "--";
                      let detailText = "";
                      let titleText = form.aiResearchDepth || "Select Configuration";

                      if (form.aiResearchDepth === "Quick Overview") {
                        estTime = "30-60 sec";
                        detailText = "(Low Detail)";
                      } else if (form.aiResearchDepth === "Standard Analysis") {
                        estTime = "2-5 min";
                        detailText = "(Medium Detail)";
                      } else if (form.aiResearchDepth === "Deep Research") {
                        estTime = "5-10 min";
                        detailText = "(High Detail)";
                      } else if (form.aiResearchDepth === "Executive Report") {
                        estTime = "10-20 min";
                        detailText = "(Extensive Detail)";
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>Estimated Time: {estTime}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                            <Eye size={12} /> {titleText} {detailText && <span style={{ color: 'var(--text-muted)' }}>{detailText}</span>}
                          </div>
                        </div>
                      );
                  })()}
                </div>
              </form>
            </div>

            {/* Results Logic migrating from DataAnalytics.jsx */}
            {marketResearch || loading ? (
              <div className="intel-panel market-research-results" style={{ marginTop: 24 }}>
                <div className="market-research-results-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="intel-row">
                      <span className="intel-text-cyan">AI</span>
                      <div className="intel-section-title">AI Generated Insights</div>
                    </div>
                    <div className="intel-section-subtitle">
                      Comprehensive market research based on your input.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {marketResearch?.model && (
                      <span className="intel-badge intel-badge-cyan">{marketResearch.model}</span>
                    )}
                    <button
                      className="intel-btn"
                      onClick={(e) => { e.preventDefault(); handleSaveResearch(); }}
                      type="button"
                      disabled={!marketResearch}
                      style={{ marginRight: 8 }}
                    >
                      Save Research
                    </button>
                    <button
                      className="intel-btn"
                      onClick={(e) => { e.preventDefault(); handleExportMarketResearch(); }}
                      type="button"
                      disabled={!marketResearch || marketExporting}
                    >
                      {marketExporting ? "Exporting..." : "Export PDF"}
                    </button>
                  </div>
                </div>

                {loading ? (
                  <MarketResearchMotionState isGenerating />
                ) : (
                  <>
                    {marketResearch && marketResearch.reportData ? (
                      <MarketResearchDashboard data={marketResearch.reportData} />
                    ) : (
                      <div className="intel-empty-state">
                        No insights available. Please generate a new report.
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}

        {['saved', 'favorites', 'archived'].includes(mainTab) && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '24px' }}>{mainTab === 'favorites' ? 'Favorite Researches' : mainTab === 'archived' ? 'Archived Researches' : 'Saved Researches'}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{mainTab === 'favorites' ? 'Your pinned market intelligence reports' : mainTab === 'archived' ? 'Archived market intelligence reports' : 'Manage and revisit your AI-generated market research'}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button type="button" onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><LayoutGrid size={16} /></button>
                  <button type="button" onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}><List size={16} /></button>
                </div>
                <button type="button" onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'} <ChevronDown size={14} style={{ transform: sortOrder === 'newest' ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                </button>
              </div>
            </div>

            {savedResearches.filter(item => {
              if (mainTab === 'archived') return item.isArchived;
              if (item.isArchived) return false;
              if (mainTab === 'favorites') return item.isFavorite;
              return true;
            }).length === 0 ? (
              <div className="intel-empty-state">No {mainTab === 'favorites' ? 'favorite' : mainTab === 'archived' ? 'archived' : 'saved'} researches found.</div>
            ) : (
              <div style={{ 
                display: viewMode === 'grid' ? 'grid' : 'flex', 
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(360px, 1fr))' : undefined,
                gap: '16px' 
              }}>
                {[...savedResearches].filter(item => {
                  if (mainTab === 'archived') return item.isArchived;
                  if (item.isArchived) return false;
                  if (mainTab === 'favorites') return item.isFavorite;
                  return true;
                }).sort((a, b) => {
                  const dateA = new Date(a.date).getTime();
                  const dateB = new Date(b.date).getTime();
                  return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                }).map(item => {
                  let desc = getSummaryText(item);
                  if (desc.length > 150) desc = desc.substring(0, 150) + "...";
                  
                  const indConfig = getIndustryConfig(item.form?.industry);
                  
                  // Use specific colors for the left block based on industry, fallback to blue gradient
                  let blockBg = "linear-gradient(135deg, #3498db, #2980b9)";
                  if (item.form?.industry?.includes("Food")) blockBg = "linear-gradient(135deg, #e67e22, #d35400)";
                  if (item.form?.industry?.includes("Health")) blockBg = "linear-gradient(135deg, #2ecc71, #27ae60)";
                  if (item.form?.industry?.includes("Finance")) blockBg = "linear-gradient(135deg, #f1c40f, #f39c12)";
                  if (item.form?.industry?.includes("Tech") || item.form?.industry?.includes("SaaS") || item.form?.industry?.includes("Technology")) blockBg = "linear-gradient(135deg, #3498db, #5dade2)";

                  const aiModelName = item.marketResearch?.model || "gemini-2.5-flash";

                  return (
                    <div key={item.id} style={{ display: 'flex', flexDirection: viewMode === 'grid' ? 'column' : 'row', gap: '24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', transition: 'all 0.2s', cursor: 'default' }}>
                      
                      {/* Left Big Icon Block */}
                      <div style={{ width: viewMode === 'grid' ? '100%' : '140px', height: viewMode === 'grid' ? '140px' : '140px', borderRadius: '12px', background: blockBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ color: '#fff', transform: 'scale(1.5)', marginBottom: '16px' }}>
                          {indConfig.icon}
                        </div>
                        <div style={{ position: 'absolute', bottom: '12px', background: 'rgba(0,0,0,0.25)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.form?.industry || 'Unknown'}
                        </div>
                      </div>

                      {/* Right Content Block */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.form?.businessName || 'Unnamed Research'}</h3>
                          <Star onClick={(e) => toggleFavorite(e, item.id)} size={18} color={item.isFavorite ? '#f1c40f' : 'var(--text-muted)'} fill={item.isFavorite ? '#f1c40f' : 'none'} style={{ cursor: 'pointer', transition: 'all 0.2s' }} className="favorite-star" />
                        </div>
                        
                        <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', flex: 1 }}>{desc}</p>
                        
                        {/* Footer row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '16px' }}>
                          
                          {/* Metadata Left */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <Calendar size={14} />
                              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&bull;</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brand-cyan)' }}>
                              <Tag size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>{item.form?.industry || 'Unknown'}</span>
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&bull;</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9b59b6' }}>
                              <Sparkles size={14} />
                              <span style={{ color: 'var(--text-muted)' }}>AI Driven Research</span>
                            </div>
                          </div>

                          {/* Action Buttons Right */}
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {mainTab === 'archived' ? (
                              <>
                                <button className="intel-btn" onClick={(e) => { e.stopPropagation(); setRestoreModalConfig({ show: true, id: item.id }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(46,204,113,0.3)', color: '#2ecc71', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }} title="Restore">
                                  Restore
                                </button>
                                <button className="intel-btn" onClick={(e) => { e.stopPropagation(); setDeleteModalConfig({ show: true, id: item.id }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }} title="Delete Permanently">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="intel-btn" onClick={(e) => { e.stopPropagation(); setArchiveModalConfig({ show: true, id: item.id }); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }} title="Archive">
                                  <Trash2 size={14} />
                                </button>
                                <button className="intel-btn" onClick={() => { setForm(item.form); setMarketResearch(item.marketResearch); setMainTab('research'); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                                  <Eye size={14} /> Open
                                </button>
                                <button className="intel-btn" onClick={() => handleExportMarketResearch(item)} disabled={marketExporting} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                                  <FileText size={14} /> Export PDF
                                </button>
                                <button className="intel-btn" onClick={() => handleExportDocx(item)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(52,152,219,0.3)', color: '#3498db', padding: '6px 14px', borderRadius: '6px', fontSize: '12px' }}>
                                  <FileText size={14} /> Export DOCX
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {archiveModalConfig.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '20px', color: 'var(--text-primary)', textAlign: 'center' }}>Archive Research?</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>Are you sure you want to move this research to the Archive?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setArchiveModalConfig({ show: false, id: null })} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleConfirmArchive} style={{ flex: 1, padding: '12px', background: 'var(--brand-cyan)', border: 'none', color: 'var(--bg-card)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Yes, Archive</button>
            </div>
          </div>
        </div>
      )}

      {restoreModalConfig.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '20px', color: 'var(--text-primary)', textAlign: 'center' }}>Restore Research?</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>This will move the research back to your Saved Researches.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setRestoreModalConfig({ show: false, id: null })} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleConfirmRestore} style={{ flex: 1, padding: '12px', background: '#2ecc71', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Yes, Restore</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalConfig.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '20px', color: '#e74c3c', textAlign: 'center' }}>Delete Permanently?</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>This action cannot be undone. Are you sure you want to permanently delete this research?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteModalConfig({ show: false, id: null })} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '12px', background: '#e74c3c', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } } .intel-select { color-scheme: light dark; } .intel-select option { background-color: var(--bg-surface, #1e1e2f); color: var(--text-primary, #ffffff); }" }} />
    </div>
  );
}
