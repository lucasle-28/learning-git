class ConnectMenu {
    constructor(buttonId, menuId) {
      this.button = document.getElementById(buttonId);
      this.menu = document.getElementById(menuId);
      this.init();
    }
  
    init() {
      this.button.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent "#" jump
        this.menu.classList.toggle('hidden');
      });
  
      document.addEventListener('click', (e) => {
        if (!this.button.contains(e.target) && !this.menu.contains(e.target)) {
          this.menu.classList.add('hidden');
        }
      });
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new ConnectMenu('connectBtn', 'connectMenu');
  });
  