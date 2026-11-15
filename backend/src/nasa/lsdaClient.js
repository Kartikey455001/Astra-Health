/**
 * NASA LSDA Client (Life Sciences Data Archive)
 * Human and animal spaceflight research archive:
 * - Bone & muscle degradation
 * - Cardiovascular adaptations
 * - Behavioral health & neurovestibular changes
 * - Operational space medicine archives
 *
 * NOTE: The LSDA portal provides catalogue access; some raw human data is restricted.
 */

const LSDA_CATALOGUE = {
  source_name: "NASA LSDA",
  portal_url: "https://nlsp.nasa.gov/explore/lsdahome",
  portal_note: "NASA Life Sciences Data Archive houses legacy and modern biomedical studies. Public records include study abstracts, protocols, and summarized findings.",
  research_areas: [
    {
      category: "Bone and Mineral Loss",
      summary: "Documented 1.0% to 1.5% bone mineral density loss per month in weight-bearing bones (calcaneus, femoral neck, lumbar spine).",
      key_variables: ["Bone mineral density (DXA)", "Urinary calcium excretion", "Serum NTX/CTX bone turnover markers"],
      countermeasures: ["Bisphosphonates", "Advanced Resistive Exercise Device (ARED)", "Vitamin D / Calcium supplementation"]
    },
    {
      category: "Muscle Degradation & Atrophy",
      summary: "Loss of muscle mass, volume, and peak force primarily affecting antigravity postural extensor muscles (soleus, gastrocnemius, quadriceps).",
      key_variables: ["Muscle cross-sectional area (MRI)", "Peak isometric force", "Mitochondrial enzyme activity"],
      countermeasures: ["Daily 2.5h resistive & aerobic exercise protocol", "High-protein dietary regimen"]
    },
    {
      category: "Cardiovascular Deconditioning",
      summary: "Cephalad fluid shift upon microgravity insertion, plasma volume reduction (~10-15%), orthostatic intolerance post-landing.",
      key_variables: ["Stroke volume", "Resting heart rate baseline shifts", "Cardiac output", "Arterial pressure regulation"],
      countermeasures: ["Fluid and salt repletion pre-entry", "Lower body negative pressure (LBNP)", "Compression garments"]
    },
    {
      category: "Behavioral Health & Circadian Rhythms",
      summary: "Sleep disruption from 90-minute orbital lighting cycles, confinement stressors, acoustic noise, and cognitive fatigue.",
      key_variables: ["Actigraphy sleep duration", "Psychomotor Vigilance Task (PVT)", "Daily subjective fatigue scales"],
      countermeasures: ["Solid-state dynamic lighting (SSDL)", "Sleep hygiene protocols", "Workload scheduling"]
    }
  ]
};

function getLsdaCatalogue() {
  return {
    ...LSDA_CATALOGUE,
    retrieved_at: new Date().toISOString(),
    data_origin: "NASA_PUBLIC"
  };
}

module.exports = {
  LSDA_CATALOGUE,
  getLsdaCatalogue
};

