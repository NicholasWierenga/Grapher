import { Component } from '@angular/core';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.css']
})
export class NavMenuComponent {
  isExpanded = false;

  collapse() {
    this.isExpanded = false;
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
  }

  switchTheme(): void {
    let html = document.getElementsByTagName(`html`)[0];
    
    if (html.style.filter === "invert(1)") {
      document.getElementById("theme")!.innerHTML = "| Light theme &nbsp;";
      html.style.filter = "invert(0)";
    }
    else {
      document.getElementById("theme")!.innerHTML = "| Dark theme &nbsp;";
      html.style.filter = "invert(1)";
    }
  }
}
