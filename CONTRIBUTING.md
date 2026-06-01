# 🤝 Katkıda Bulunma Rehberi / Contributing Guide

AgentsHUB'a katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, süreci olabildiğince sorunsuz hale getirmek için hazırlanmıştır.

*Thank you for your interest in contributing to AgentsHUB! This guide will help you get started.*

---

## 🇹🇷 Türkçe

### Başlamadan Önce

1. Bu repoyu **fork** edin
2. Kendi fork'unuzdan yeni bir **feature branch** oluşturun:
   ```bash
   git checkout -b feature/yeni-ozellik
   ```
3. Değişikliklerinizi yapın ve test edin
4. Commit'lerinizi [Conventional Commits](https://www.conventionalcommits.org/) formatında yazın:
   ```bash
   git commit -m "feat(skills): yeni PDF analiz yeteneği eklendi"
   ```
5. Branch'inizi push edin ve bir **Pull Request** açın

### Commit Mesajı Formatı

```
<tip>(<kapsam>): <açıklama>

Tipler: feat, fix, docs, style, refactor, test, chore
```

### Kod Standartları

- **Dil:** TypeScript tercih edilir. JavaScript yalnızca `/skills/` klasöründe kabul edilir
- **Test:** Yeni özellikler için test yazılması beklenir
- **Dokümantasyon:** Public API değişiklikleri README'de belgelenmelidir
- **Linting:** PR açmadan önce kodunuzun hatasız derlenebildiğinden emin olun

### Yeni Skill (Yetenek) Ekleme

AgentsHUB'ın en kolay katkı noktası yeni yetenekler eklemektir:

1. `Marketplace/skills/` klasörüne yeni bir `.js` dosyası oluşturun
2. Standart skill kontratını uygulayın: `name`, `description`, `parameters`, `execute(args)`
3. Skill'inizi test edin
4. PR açarken skill'in ne yaptığını açıklayın

### Bug Raporu

Bir hata bulduysanız, lütfen [Bug Report](../../issues/new?template=bug_report.md) şablonunu kullanarak bir Issue açın.

### Özellik Talebi

Yeni bir özellik önermek için [Feature Request](../../issues/new?template=feature_request.md) şablonunu kullanın.

---

## 🇬🇧 English

### Getting Started

1. **Fork** this repository
2. Create a **feature branch** from your fork:
   ```bash
   git checkout -b feature/new-feature
   ```
3. Make your changes and test them
4. Write commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(skills): add new PDF analysis skill"
   ```
5. Push your branch and open a **Pull Request**

### Code Standards

- **Language:** TypeScript preferred. JavaScript only accepted in `/skills/` directory
- **Testing:** New features should include tests
- **Documentation:** Public API changes must be documented in README
- **Linting:** Ensure your code compiles without errors before opening a PR

### Adding New Skills

The easiest way to contribute is by adding new skills:

1. Create a new `.js` file in `Marketplace/skills/`
2. Implement the standard skill contract: `name`, `description`, `parameters`, `execute(args)`
3. Test your skill
4. Explain what the skill does in your PR description

---

## 📧 İletişim / Contact

Sorularınız için: **info@agentshub.com.tr**

**EHARTE Elektrikli Hava Araçları Teknolojileri Ltd. Şti.**
İTÜ Çekirdek + Mersin Teknopark
