import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/services/auth-store';
import { ChatSession } from '../../core/services/chat-session';
import { SettingsStore } from '../../core/services/settings-store';
import { Composer } from './composer';
import { ConversationSidebar } from './conversation-sidebar';
import { MessageList } from './message-list';
import { SettingsPanel } from './settings-panel';

@Component({
  selector: 'app-chat-page',
  imports: [ConversationSidebar, MessageList, Composer, SettingsPanel],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.scss',
})
export class ChatPage {
  readonly settings = inject(SettingsStore);
  readonly session = inject(ChatSession);
  readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly settingsOpen = signal(false);
  readonly sidebarOpen = signal(false);

  lock(): void {
    this.session.stop();
    this.settingsOpen.set(false);
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
