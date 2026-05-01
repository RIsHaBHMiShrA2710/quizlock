import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserInfo {
  field: string;
  className: string;
  exam: string;
  groqApiKey: string;
  questionType: 'mcq' | 'open_ended';
}

@Component({
  selector: 'app-options',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './options.html',
  styleUrl: './options.scss'
})
export class Options implements OnInit {
  savedMessage = '';

  userInfo: UserInfo = {
    field: '',
    className: '',
    exam: '',
    groqApiKey: '',
    questionType: 'mcq'
  };

  blockedSitesList = '';

  ngOnInit() {
    this.loadState();
  }

  loadState() {
    chrome.storage.local.get(['userInfo', 'blockedSites'], (result: any) => {
      if (result.userInfo) {
        this.userInfo = result.userInfo;
      }
      if (result.blockedSites) {
        this.blockedSitesList = result.blockedSites.join('\n');
      }
    });
  }

  save() {
    const blockedSitesArray = this.blockedSitesList
      .split('\n')
      .map(s => s.trim())
      .filter(s => s);

    chrome.storage.local.set({
      userInfo: this.userInfo,
      blockedSites: blockedSitesArray
    }, () => {
      this.savedMessage = 'Settings saved successfully!';
      setTimeout(() => this.savedMessage = '', 3000);
    });
  }
}
