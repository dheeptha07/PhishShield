
const analyzeButton = document.getElementById("analyze");
const status = document.getElementById("status");
const result = document.getElementById("result");

analyzeButton.addEventListener("click", async () => {
  status.textContent = "Reading the open email...";
  result.hidden = true;

  try {
    // 1. Get the active browser tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    const currentUrl = tab?.url || "";

    const isGmail = currentUrl.startsWith(
      "https://mail.google.com/"
    );

    const isOutlook =
      currentUrl.startsWith("https://outlook.office.com/") ||
      currentUrl.startsWith("https://outlook.live.com/") ||
      currentUrl.startsWith("https://outlook.cloud.microsoft/");

    if (!tab?.id || (!isGmail && !isOutlook)) {
      status.textContent =
        "Please open Gmail or Outlook on the web.";
      return;
    }

    // 2. Request the email from the content script
    let email;

    try {
      email = await chrome.tabs.sendMessage(tab.id, {
        action: "GET_EMAIL"
      });
    } catch (firstError) {
      console.warn(
        "Content script not responding. Attempting injection:",
        firstError.message
      );

      status.textContent = "Connecting to the email page...";

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      // Retry after injecting content.js
      email = await chrome.tabs.sendMessage(tab.id, {
        action: "GET_EMAIL"
      });
    }

    if (!email) {
      throw new Error(
        "No response received from the content script."
      );
    }

    if (email.error) {
      status.textContent = email.error;
      return;
    }

    // 3. Send extracted email to the local backend
    status.textContent = "Analyzing email...";

    const response = await fetch(
      "https://phishshield-m3sn.onrender.com/analyze",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: email.subject || "",
          sender: email.sender || "",
          body: email.body || ""
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "The PhishShield API could not analyze the email."
      );
    }

    const mlResult = await response.json();

    // 4. Display extracted email information
    document.getElementById("subject").textContent =
      email.subject || "Not detected";

    document.getElementById("sender").textContent =
      email.sender || "Not detected";

    document.getElementById("links").textContent =
      (email.links || []).length;

    document.getElementById("bodyPreview").textContent =
      (email.body || "").slice(0, 500);

    // 5. Display ML verdict in the top card
    const mlPanel = document.getElementById("mlResult");
    const mlTitle = mlPanel.querySelector("h4");

    const isPhishing =
      String(mlResult.prediction).toLowerCase() === "phishing";

    mlTitle.textContent = isPhishing
      ? "⚠️ Phishing detected"
      : "✓ Likely benign";

    // Avoid displaying the same verdict twice
    document.getElementById("mlPrediction").textContent = "";

    document.getElementById("mlRisk").textContent =
      `Score-based risk: ${mlResult.risk_level}`;

    document.getElementById("mlScore").textContent =
      `Model phishing score: ${mlResult.phishing_score}/100`;

    document.getElementById("mlNote").textContent =
      mlResult.note || "";

    // Apply the corresponding visual style
    mlPanel.classList.remove("phishing", "benign");
    mlPanel.classList.add(
      isPhishing ? "phishing" : "benign"
    );

    // 6. Display rule-based risk assessment
    const assessment = email.riskAssessment;

    if (assessment) {
      document.getElementById("riskLevel").textContent =
        `Risk level: ${assessment.risk}`;

      document.getElementById("riskScore").textContent =
        `Risk score: ${assessment.score}/100`;

      const riskReasons =
        document.getElementById("riskReasons");

      riskReasons.replaceChildren();

      (assessment.reasons || []).forEach(reason => {
        const li = document.createElement("li");
        li.textContent = reason;
        riskReasons.appendChild(li);
      });
    }

    // 7. Display URL warnings
    const findings = email.linkFindings || [];

    const linkStatus =
      document.getElementById("linkStatus");

    const linkFindings =
      document.getElementById("linkFindings");

    linkFindings.replaceChildren();

    if (findings.length === 0) {
      linkStatus.textContent =
        "No basic URL warning signs detected.";
    } else {
      linkStatus.textContent =
        `${findings.length} URL(s) need further inspection.`;

      findings.forEach(item => {
        const li = document.createElement("li");
        const url = document.createElement("div");
        const reasons = document.createElement("div");

        url.textContent = item.url || "Unknown URL";

        reasons.textContent =
          (item.reasons || []).join(", ");

        li.append(url, reasons);
        linkFindings.appendChild(li);
      });
    }

    // 8. Show the completed results
    result.hidden = false;
    status.textContent = "Email analyzed successfully.";

  } catch (error) {
    console.error("PhishShield error:", error);

    status.textContent =
      "Error: " + (error.message || String(error));
  }
});
