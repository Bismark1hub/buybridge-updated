// footer.js - injects a shared footer into every page.
// Why: one source of truth instead of pasting the same HTML into every file.

function renderFooter() {
  const footerContainer = document.getElementById('site-footer');

  // Safety check: if a page forgot the placeholder div, do nothing (no crash)
  if (!footerContainer) return;

  const year = new Date().getFullYear();

  footerContainer.innerHTML = `
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
          <a href="terms.html">Terms</a>
          <a href="privacy.html">Privacy</a>
        </div>
        <p class="footer-copyright">&copy; ${year} BuyBridge. All rights reserved.</p>
      </div>
    </footer>
  `;
}

document.addEventListener('DOMContentLoaded', renderFooter);
