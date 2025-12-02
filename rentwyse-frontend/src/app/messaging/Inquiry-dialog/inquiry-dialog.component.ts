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
  messageContent!: string;

  constructor(
    public dialogRef: MatDialogRef<InquiryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { partnerId: string, postId: string },
    private messageService: MessageService
  ) {}

  onSend() {
    if (!this.messageContent) return;

    // Assuming that `startOrGetConversation` will handle the logic of creating a new
    // conversation if it doesn't exist, and returning its ID.
    this.messageService.startOrGetConversation(this.data.partnerId, this.data.postId).subscribe(conversation => {
      // Now, `conversation` should have an `_id` field which is the conversation ID.
      // The sendMessage method should require only the conversation ID and the message content.
      this.messageService.sendMessage(this.data.partnerId, this.messageContent).subscribe(() => {
        // Handle the successful sending of a message.
        this.dialogRef.close();
      }, error => {
        // Handle errors here, such as displaying a notification to the user.
      });
    }, error => {
      // Handle errors here, such as if the conversation couldn't be started or retrieved.
    });
  }
}
