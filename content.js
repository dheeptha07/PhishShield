
function analyzeLinks(links) {
  const findings = [];
  const seen = new Set();

  const shorteners = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly"
  ];

  for (const item of links) {
    const link = item.url;
    const displayedText = item.text || "";

    if (!link || seen.has(link)) continue;
    seen.add(link);

    try {
      const url = new URL(link);
      const host = url.hostname.toLowerCase();
      const reasons = [];

      if (url.username || url.password) {
        reasons.push("URL contains misleading user information");
      }

      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
        reasons.push("Uses an IP address instead of a domain");
      }

      if (shorteners.includes(host)) {
        reasons.push("Shortened URL hides the final destination");
      }

      if (
        /^https?:\/\//i.test(displayedText) &&
        (() => {
          try {
            return (
              new URL(displayedText).hostname.toLowerCase() !== host
            );
          } catch {
            return true;
          }
        })()
      ) {
        reasons.push(
          "Displayed URL does not match the actual destination"
        );
      }

      if (host.startsWith("xn--") || host.includes(".xn--")) {
        reasons.push("Domain uses internationalized encoding");
      }

      if (reasons.length > 0) {
        findings.push({ url: link, reasons });
      }
    } catch {
      findings.push({
        url: link,
        reasons: ["Invalid URL format"]
      });
    }
  }

  return findings;
}


// Extract text, including emoji rendered as images.
function extractSubject(element) {
  if (!element) return "";

  let subject = (
    element.innerText ||
    element.textContent ||
    ""
  ).trim();

  if (subject) return subject;

  subject = Array.from(element.querySelectorAll("img"))
    .map(img => img.getAttribute("alt") || "")
    .join("")
    .trim();

  if (subject) return subject;

  return Array.from(
    element.querySelectorAll("[aria-label], [title]")
  )
    .map(el =>
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      ""
    )
    .join("")
    .trim();
}


function getTextFromSelectors(root, selectors) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);

    const value = (
      element?.innerText ||
      element?.textContent ||
      ""
    ).trim();

    if (value) return value;
  }

  return "";
}


// Gmail subject extraction, including emoji-only subjects.
function getGmailSubject() {
  const subjectElement = document.querySelector(
    '[role="main"] h2.hP'
  );

  let subject = extractSubject(subjectElement);

  if (subject) return subject;

  const threadElement = document.querySelector(
    '[data-thread-perm-id]'
  );

  if (threadElement) {
    subject = extractSubject(threadElement);

    if (
      subject &&
      !subject.includes("@") &&
      !/^(search|labels|inbox|sent|drafts)$/i.test(subject)
    ) {
      return subject;
    }
  }

  const titleParts = (document.title || "").split(" - ");

  if (titleParts.length >= 2) {
    const firstPart = titleParts[0].trim();
    const secondPart = titleParts[1].trim();

    if (
      firstPart &&
      !firstPart.includes("@") &&
      secondPart.includes("@")
    ) {
      return firstPart;
    }
  }

  console.warn("PhishShield: Gmail subject could not be extracted.");
  return "";
}


function extractEmailAddress(value) {
  if (!value) return "";

  const match = value.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match ? match[0] : "";
}


// Extract the sender from Outlook on the web.
function getOutlookSender(main) {
  const senderHeader =
    main.querySelector('[id$="_FROM"][role="heading"]') ||
    main.querySelector('[id*="_FROM"][role="heading"]') ||
    main.querySelector('[id*="_FROM"]');

  const fromLabel = senderHeader?.querySelector(
    '[aria-label^="From:"]'
  );

  const senderName = (
    fromLabel?.getAttribute("aria-label")
      ?.replace(/^From:\s*/i, "") ||
    senderHeader?.innerText ||
    ""
  ).trim();

  // First search within the message-specific sender header.
  const searchRoots = senderHeader
    ? [senderHeader]
    : [main];

  const selectors = [
    "[email]",
    "[data-email]",
    '[title*="@"]',
    '[aria-label*="@"]'
  ];

  for (const root of searchRoots) {
    for (const selector of selectors) {
      for (const element of root.querySelectorAll(selector)) {
        const candidate = [
          element.getAttribute("email"),
          element.getAttribute("data-email"),
          element.getAttribute("title"),
          element.getAttribute("aria-label"),
          element.innerText,
          element.textContent
        ].filter(Boolean).join(" ");

        const address = extractEmailAddress(candidate);

        if (address) {
          return senderName
            ? `${senderName} <${address}>`
            : address;
        }
      }
    }
  }

  // If Outlook exposes only a display name, keep it.
  // Do not penalize a known display name as a missing sender address.
  if (senderName) {
    console.warn(
      "PhishShield: Outlook exposes a sender name but not its address."
    );
    return senderName;
  }

  // Fallback: look for the sender's name in the visible message header.
  const fallbackHeader = main.querySelector(
    '[aria-label^="From:"]'
  );

  const fallbackName = fallbackHeader
    ?.getAttribute("aria-label")
    ?.replace(/^From:\s*/i, "")
    .trim();

  return fallbackName || "";
}


// Rule-based email risk assessment.
function assessEmailRisk(email) {
  const text = `${email.subject || ""} ${email.body || ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  let score = 0;
  const reasons = [];
  const matchedCategories = [];

  const categories = [
    {
      name: "Urgency and pressure",
      weight: 8,
      max: 16,
      phrases: [
        "urgent",
        "immediately",
        "act now",
        "limited time",
        "final warning",
        "last chance",
        "expires today",
        "immediate action required",
        "within 24 hours",
        "don't delay",
        "do not delay",
        "act immediately",
        "today only"
      ]
    },
    {
      name: "Financial scams and prizes",
      weight: 12,
      max: 24,
      phrases: [
        "you have won",
        "free gift",
        "claim your prize",
        "lottery winner",
        "cash reward",
        "guaranteed profit",
        "earn money fast",
        "you are the lucky winner",
        "claim your reward",
        "prize money"
      ]
    },
    {
      name: "Account and security threats",
      weight: 8,
      max: 16,
      phrases: [
        "verify your account",
        "account suspended",
        "account will be suspended",
        "account blocked",
        "unusual activity",
        "password expired",
        "confirm your identity",
        "your account will be deleted",
        "unauthorized login",
        "account will be closed",
        "restore access"
      ]
    },
    {
      name: "Payment and banking concerns",
      weight: 8,
      max: 16,
      phrases: [
        "payment failed",
        "refund pending",
        "bank account blocked",
        "kyc update required",
        "pan verification",
        "upi payment pending",
        "your card is blocked",
        "outstanding invoice",
        "payment overdue",
        "transfer funds immediately",
        "verify your bank account"
      ]
    },
    {
      name: "Spam marketing language",
      weight: 3,
      max: 6,
      phrases: [
        "act fast",
        "buy now",
        "risk-free",
        "no investment required",
        "100% guaranteed",
        "lowest price",
        "earn from home",
        "exclusive deal",
        "free trial"
      ]
    }
  ];

  for (const category of categories) {
    const matches = category.phrases.filter(phrase =>
      text.includes(phrase)
    );

    if (matches.length > 0) {
      const categoryScore = Math.min(
        matches.length * category.weight,
        category.max
      );

      score += categoryScore;
      matchedCategories.push(category.name);

      reasons.push(
        `${category.name}: ${matches.join(", ")} (+${categoryScore})`
      );
    }
  }

  // Credential-related wording is a weak signal on its own.
  const credentialMentions = [
    "username and password",
    "student login",
    "login credentials",
    "login details",
    "student account",
    "password for student login"
  ];

  const credentialMatches = credentialMentions.filter(phrase =>
    text.includes(phrase)
  );

  if (credentialMatches.length > 0) {
    score += 4;

    reasons.push(
      `Credential-related wording: ${credentialMatches.join(", ")} (+4)`
    );
  }

  // Add weight for explicit requests to disclose sensitive information.
  const secretRequestPatterns = [
    /\b(send|share|email|text|tell|provide)\s+(us\s+|me\s+)?(your\s+)?(password|otp|one[- ]time password)\b/i,
    /\b(enter|submit|type)\s+(your\s+)?(password|otp|one[- ]time password)\s+(here|below|on this page|to continue)\b/i,
    /\b(provide|submit|enter)\s+your\s+(login credentials|credentials)\b/i
  ];

  const hasSecretRequest = secretRequestPatterns.some(pattern =>
    pattern.test(text)
  );

  if (hasSecretRequest) {
    score += 25;

    reasons.push(
      "Possible request to disclose a password, OTP, or login credentials (+25)"
    );
  }

  const hasUrgency =
    matchedCategories.includes("Urgency and pressure");

  const hasAccountThreat =
    matchedCategories.includes("Account and security threats");

  const hasPaymentConcern =
    matchedCategories.includes("Payment and banking concerns");

  if (
    hasUrgency &&
    (hasAccountThreat || hasPaymentConcern || hasSecretRequest)
  ) {
    score += 12;

    reasons.push(
      "Combined warning: urgency paired with a security or payment concern (+12)"
    );
  }

  const linkCount = (email.linkFindings || []).length;

  if (linkCount > 0) {
    const linkScore = Math.min(linkCount * 12, 24);

    score += linkScore;

    reasons.push(
      `${linkCount} URL(s) triggered security checks (+${linkScore})`
    );
  }

  // Penalize only when sender information is genuinely unavailable.
  if (!email.sender || !email.sender.trim()) {
    score += 8;
    reasons.push("Sender information could not be extracted (+8)");
  }

  score = Math.min(score, 100);

  let risk = "Low";

  if (score >= 60) {
    risk = "High";
  } else if (score >= 25) {
    risk = "Medium";
  }

  if (reasons.length === 0) {
    reasons.push(
      "No indicators from the current basic checks were detected"
    );
  }

  return { score, risk, reasons };
}


// Extract the currently open email from Gmail or Outlook.
function getCurrentEmail() {
  let subject = "";
  let sender = "";
  let body = "";
  let bodyElement = null;

  const isGmail =
    location.hostname === "mail.google.com";

  
const isOutlook =
  location.hostname === "outlook.office.com" ||
  location.hostname === "outlook.live.com" ||
  location.hostname === "outlook.cloud.microsoft";


  if (isGmail) {
    subject = getGmailSubject();

    const senderElement =
      document.querySelector('[role="main"] .gD') ||
      document.querySelector(".gD") ||
      document.querySelector("[email][name]");

    sender =
      senderElement?.getAttribute("email") ||
      extractEmailAddress(senderElement?.innerText || "") ||
      "";

    bodyElement =
      document.querySelector('[role="main"] .a3s') ||
      document.querySelector(".a3s");

    body = bodyElement?.innerText?.trim() || "";

  } else if (isOutlook) {
    const main =
      document.querySelector('[role="main"]') ||
      document;

    // Outlook's subject may be represented by a message heading.
    const outlookSubjectSelectors = [
      '[data-testid="message-subject"]',
      '[aria-label="Subject"]',
      '[id*="_SUBJECT"]',
      '[role="heading"][aria-level="2"]',
      '[role="heading"][aria-level="1"]',
      "h1",
      "h2"
    ];

    subject = getTextFromSelectors(
      main,
      outlookSubjectSelectors
    );

    // Outlook may expose an emoji-only subject in the browser title.
    if (!subject) {
      const pageTitle = (document.title || "").trim();

      const titleParts = pageTitle.split(" - ");

      if (titleParts.length >= 2) {
        const possibleSubject = titleParts[0].trim();

        if (
          possibleSubject &&
          !/^(mail|outlook|inbox)$/i.test(possibleSubject)
        ) {
          subject = possibleSubject;
        }
      }
    }

    sender = getOutlookSender(main);

    bodyElement =
      main.querySelector('[role="document"]') ||
      main.querySelector('[aria-label="Message body"]') ||
      main.querySelector(".ReadingPaneContainer");

    body = bodyElement?.innerText?.trim() || "";

  } else {
    return {
      error: "Please open Gmail or Outlook on the web."
    };
  }

  if (!subject && !body) {
    return {
      error: "Could not read the email. Open a message and try again."
    };
  }

  const links = bodyElement
    ? Array.from(bodyElement.querySelectorAll("a[href]"))
        .map(link => ({
          url: link.href,
          text: (
            link.innerText ||
            link.textContent ||
            ""
          ).trim()
        }))
        .filter(link => link.url)
    : [];

  const email = {
    subject: subject || "Not detected",
    sender,
    body,
    links,
    linkFindings: analyzeLinks(links)
  };

  email.riskAssessment = assessEmailRisk(email);

  return email;
}


console.log("PhishShield content script loaded");

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.action === "GET_EMAIL") {
      console.log("PhishShield received GET_EMAIL");
      sendResponse(getCurrentEmail());
    }
  }
);
