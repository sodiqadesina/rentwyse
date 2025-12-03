// inquiry-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MessageService } from '../messaging.service';

@Component({
  selector: 'app-inquiry-dialog',
  templateUrl: 'inquiry-dialog.component.html',
  styleUrls: ['inquiry-dialog.component.css']
})
export class InquiryDialogComponent {
  messageContent = '';

  constructor(
    public dialogRef: MatDialogRef<InquiryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { partnerId: string; postId: string },
    private messageService: MessageService
  ) {}

  onSend(): void {
    const trimmed = this.messageContent.trim();
    if (!trimmed) return;

    // 1) Get (or create) the conversation for THIS post
    this.messageService
      .startOrGetConversation(this.data.partnerId, this.data.postId)
      .subscribe({
        next: (res: any) => {
          // Backend returns: { message, conversationId, postId }
          const conversationId = res.conversationId || res._id;
          if (!conversationId) {
            console.error('No conversationId returned from startOrGetConversation', res);
            return;
          }

          // 2) Send message IN that specific conversation
          this.messageService
            .replyMessage(conversationId, this.data.partnerId, trimmed)
            .subscribe({
              next: () => {
                  this.dialogRef.close({
                  conversationId,
                  postId: this.data.postId
                });
              },
              error: (err) => {
                console.error('Failed to send inquiry message', err);
                // TODO: show snackbar / toast if you want
              }
            });
        },
        error: (err) => {
          console.error('Failed to start or get conversation', err);
          // TODO: show snackbar / toast if you want
        }
      });
  }
}
