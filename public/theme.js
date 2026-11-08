// Runs before the application/styles load, so a saved light theme never flashes dark.
(() => {
  const key = 'rust-foundry-theme-v1';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference;
  const valid = value => value === 'light' || value === 'dark';
  try { const value = localStorage.getItem(key); if (valid(value)) preference = value; } catch { /* The switch still works for this visit. */ }
  const apply = () => {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#121518' : '#f6f8fa';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121518' : '#f6f8fa');
    document.getElementById('theme-toggle')?.setAttribute('aria-checked', String(theme === 'dark'));
    const label = document.getElementById('theme-label'); if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    const control = document.getElementById('theme-toggle'); if (control) control.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#theme-toggle')) return;
    preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch { /* Keep the selected theme in memory. */ }
    apply();
  });
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.newValue) ? event.newValue : undefined; apply(); }
  });
})();
