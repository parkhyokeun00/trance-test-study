---
title: TranslateGemma 4B WebGPU
emoji: 🌐
colorFrom: blue
colorTo: purple
sdk: static
pinned: false
license: apache-2.0
short_description: Private browser-based translator with 56 languages
app_file: dist/index.html
header: default
thumbnail: https://cdn-uploads.huggingface.co/production/uploads/61b253b7ac5ecaae3d1efe0c/JYmJ-qdk3NnzlV58SDVao.png

models:
  - google/translategemma-4b-it
  - onnx-community/translategemma-text-4b-it-ONNX
---

# TranslateGemma Browser Translator

A web-based translation application powered by Google's TranslateGemma model, running entirely in your browser with Transformers.js and ONNX Runtime Web.

## ✨ Features

- 🌍 **56 Languages** - Translate between 56 different languages
- 🔒 **Completely Private** - All processing happens in your browser, no data sent to servers
- 📴 **Offline-Capable** - Works offline after initial model download
- ⚡ **Real-time Translation** - Auto-translate with 500ms debounce
- 🔗 **Shareable Links** - Share translations with URL hash parameters
- 📱 **Mobile Responsive** - Optimized for both desktop and mobile devices
- 💾 **Local Caching** - Model cached locally for instant subsequent loads

## 🤖 TranslateGemma

This application uses [Google's TranslateGemma](https://blog.google/technology/developers/gemma-open-models/), a state-of-the-art language model specifically designed for translation tasks. TranslateGemma is part of Google's Gemma family of open models, delivering high-quality translations across 56 languages directly in your browser using [Transformers.js](https://huggingface.co/docs/transformers.js) and ONNX Runtime Web.

## 🔒 Completely Private & Offline-Capable

Your translations are processed entirely in your browser with **no data sent to any server**. Once the model is downloaded, you can use this translator completely offline. Your text never leaves your device, ensuring complete privacy and security. The model is cached locally, so subsequent visits will load instantly without any downloads.
