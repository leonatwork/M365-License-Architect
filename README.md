# 🏗️ License Architect by Leon Machnik

**A modern, intelligent Microsoft 365 licensing calculator for consultants and IT architects.**

The **License Architect** is a single-page web application designed to simplify complex M365 licensing scenarios. It validates requirements in real-time, calculates cost-efficiency (including Break-Even analysis for E5), and visualizes the "As-Is" vs. "To-Be" state with a high-end Glassmorphism UI.

![License Architect Screenshot](https://via.placeholder.com/800x400?text=License+Architect+Preview)

---

## 🚀 Key Features

### 1. Intelligent Licensing Engine
* **Frontline Guardrails:** Automatically detects when a *Frontline* persona requires Enterprise features (e.g., Desktop Apps, Windows OS, Teams Phone) and upgrades the base license recommendation accordingly.
* **E5 Auto-Upsell:** Continuously calculates the break-even point. If a combination of *Base License + Add-ons* (e.g., E3 + Security + Compliance) becomes more expensive than the **M365 E5 Suite**, the tool automatically recommends the E5 upgrade.
* **Intune Suite Optimization:** Smartly compares the cost of individual add-ons (e.g., *Endpoint Privilege Management* + *Remote Help*) against the full *Intune Suite* bundle to find the cheapest option.

### 2. Accurate Pricing Logic (2025 Ready)
* **Teams Unbundling (EEA):** Built for the European Economic Area market. Base licenses use "No-Teams" pricing, and the correct **Teams EEA Add-on** is added dynamically based on the specific license tier (different pricing for Business vs. Enterprise).
* **Detailed Add-ons:** Includes pricing logic for Copilot, Intune Suite, Defender for Business Servers, and more.

### 3. Advanced Comparison & Analytics
* **"As-Is" vs. "To-Be":** Define the customer's current licensing state and compare it with the recommendation.
* **Smart Feature Diff:** A modal view allows you to see exactly which features are **Gained** 🟢 (considering hierarchy, e.g., P2 > P1) and which are **Lost** 🔴.
* **Investment Delta:** Instantly see the monthly price difference (Invest vs. Saving) per user.

### 4. Modern UI & UX
* **Glassmorphism Design:** A high-end, modern interface featuring frosted glass effects, vibrant gradients, and smooth transitions.
* **Deep Dark Mode:** Fully optimized "Deep Dark" mode with high-contrast elements for professional use in low-light environments.
* **Single-File Solution:** The entire app lives in one `index.html` file. No backend, no build process, no installation required.

---

## 🛠️ Tech Stack

* **Core:** Vanilla HTML5 & JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN)
* **Icons:** FontAwesome (via CDN)
* **Fonts:** Inter (Google Fonts)

---

## 📦 Installation

No installation is required. This tool is designed to run client-side in any modern browser.

1.  Download the `index.html` file.
2.  Open it in **Microsoft Edge**, **Chrome**, or **Firefox**.
3.  *Note:* An active internet connection is required to load the styling libraries (Tailwind/FontAwesome).

---

## 📊 Usage Guide

1.  **Define Persona:** Enter the name, user quantity, and workstyle (Office vs. Frontline).
2.  **Select Requirements:** Toggle the required features across Productivity, Endpoint, Security, and Compliance.
3.  **Review Recommendation:** The tool updates instantly. Check the "Decision Logic" box to understand *why* a specific license was chosen.
4.  **Add to Quote:** Click "Add to Quote" to save the persona to the summary table below.
5.  **Export:** Use the CSV Export button to download your calculation for further processing in Excel.

---

## 📄 License

This project is licensed under the **MIT License**.

Copyright (c) 2025 **Leon Machnik**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
