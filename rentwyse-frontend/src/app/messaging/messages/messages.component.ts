// messages.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
import { MessageService } from '../messaging.service';
import { FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService } from 'src/app/notification/socket.service';
import { docTypeValidator } from './doc-type.validator';
import { ConfirmationDialogComponent1 } from 'src/app/auth/settings/confirmation-dialog.component';
import { MatDialog ,MatDialogRef, MAT_DIALOG_DATA  } from '@angular/material/dialog';
import {ConfirmationDialogComponent} from "./delete-confirmation.component"

declare global {
  interface Window {
    paypal: any;  
  }
}


@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  providers: [DatePipe] // Adding DatePipe to the component's providers
})
export class MessagesComponent implements OnInit, AfterViewChecked, OnDestroy{
  conversations: any[] = [];
  selectedConversation: any;
  selectedConversationMessages: any[] = [];
  isLoading = false;
  messageForm: FormGroup; // Add this line
  currentUserId = this.authService.getUserId();
  private newMessageSub!: Subscription;
  conversationReadStatus: { [conversationId: string]: boolean } = {};
  currentImageIndex: number = 0;
  viewingDateForm!: FormGroup;
  viewingDateSet: boolean = false;
  documentForm!: FormGroup;   
  fileList: FileList | null = null;
  isViewingConversation = false; 
  renegotiationForm!: FormGroup;
  renegotiatedPrice: number = 5;




  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private fb: FormBuilder, // Injecting FormBuilder
    private datePipe: DatePipe, // Injecting DatePipe here
    private route: ActivatedRoute, // Injecting ActivatedRoute here
    private socketService: SocketService,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
  ) {
    this.messageForm = this.fb.group({ // Initialize the form group
      content: ['', Validators.required] // Add validators as needed
    });
  }

  @ViewChild('messagesContainer')
    private messagesContainer!: ElementRef;

    ngOnInit() {
        this.loadConversations(() => {
          // After conversations have loaded, select the one from the route parameter if it exists
          this.route.params.subscribe(params => {
            const conversationId = params['conversationId'];
            if (conversationId) {
              this.selectConversationById(conversationId);
            }
          });
            });
            this.setupNewMessageListener();
            this.viewingDateForm = this.fb.group({
              viewingDate: [null, Validators.required],
              viewingTime: ['', Validators.required]
            });
            this.documentForm = this.formBuilder.group({
              documents: [null, [docTypeValidator(['pdf', 'doc', 'docx'])]]
            });

            this.renegotiationForm = new FormGroup({
              price: new FormControl(null, [Validators.required, Validators.min(1)])
            });
      }


            
      // initiatePayPalTransaction() {
      //   if (this.selectedConversation && this.selectedConversation._id) {
      //     this.messageService.createPayPalTransaction(this.selectedConversation._id)
      //       .subscribe(response => {
      //         if (response && response.approvalUrl) {
      //           // Redirect the user to the PayPal approval URL
      //           window.open(response.approvalUrl, '_blank');
      //         } else {
      //           console.error('No approval URL received');
      //         }
      //       }, error => {
      //         console.error('Error creating PayPal transaction', error);
      //       });
      //   }
      // }

      // handlePaymentSuccess() {
      //   if (this.selectedConversation && this.selectedConversation._id) {
      //     this.messageService.updatePaymentStatus(this.selectedConversation._id)
      //       .subscribe(() => {
      //         // Handle successful payment status update
      //         console.log('Payment status updated successfully');
      //       }, error => {
      //         console.error('Error updating payment status', error);
      //       });
      //   }
      // }
      
      
      
      




      onRenegotiatePrice() {
        if (this.renegotiationForm.valid) {
          const basePrice = this.renegotiationForm.value.price;
          const serviceCharge = 0.10 * basePrice; // 10% service charge
          this.renegotiatedPrice = basePrice + serviceCharge;
    
          // Here you can also update the 'Renegotiated price' in the conversation properties
          // and make an API call to save this information.
        }
      }

      
      

      onDeleteDocument(filename: string, documentType: 'agreementDocument' | 'signedAgreementDocument') {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          width: '300px',
          data: {
            title: 'Confirm Deletion',
            message: 'Are you sure you want to delete this document?'
          }
        });


        dialogRef.afterClosed().subscribe(confirmed => {
          if (confirmed) {
            // User confirmed the deletion
            // Call service to delete the document
            this.messageService.deleteDocument(this.selectedConversation._id, filename)
            .subscribe(response => {
              // Handle successful deletion
              console.log('Document deleted:', response);
              // Remove the document from the UI
              if (documentType === 'agreementDocument') {
                this.selectedConversation.agreementDocuments = this.selectedConversation.agreementDocuments.filter((doc: string) => doc !== filename);
              } else {
                this.selectedConversation.signedAgreementDocuments = this.selectedConversation.signedAgreementDocuments.filter((doc: string) => doc !== filename);
              }

              const dialogRef = this.dialog.open(ConfirmationDialogComponent1, {
                data: { title: 'Document Delete Update', message: 'Your Document was Deleted successfully!' }
              });
        
              // Handle the dialog close event
              dialogRef.afterClosed().subscribe(() => {
                // Redirect or perform other actions
                // this.router.navigate(["/auth/settings"]);
              });
              
            }, error => {
              // Handle deletion error
              console.log(error)
            });
              }
        });

        
      }
      
    
      onDownloadDocument(filename: string) {
        this.messageService.downloadDocument(filename)
          .subscribe(blob => {
            // Create a temporary link element to initiate download
            const blobUrl = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = blobUrl;
            tempLink.download = filename;
            tempLink.click();
            URL.revokeObjectURL(blobUrl);
          }, error => {
            // Handle download error
            console.log("error downloading document - ",error)
          });
      }


      
    isUserPostCreator() {
      return this.selectedConversation?.postId?.creator === this.currentUserId;
  }

    onSetViewingDate() {
    if (this.viewingDateForm.valid) {
      const date = this.viewingDateForm.get('viewingDate')?.value;
      const time = this.viewingDateForm.get('viewingTime')?.value;

      // Combine date and time
      const viewingDate = new Date(date);
      const [hours, minutes] = time.split(':');
      viewingDate.setHours(hours, minutes);

        if (viewingDate) {
            this.messageService.setViewingDate(this.selectedConversation._id, viewingDate)
                .subscribe(response => {
                    // Handle success
                    this.viewingDateSet = true;

                    // Update the UI with the new viewing date
                    this.updateViewingDate(this.selectedConversation._id, new Date(viewingDate));

                    const dialogRef = this.dialog.open(ConfirmationDialogComponent1, {
                      data: { title: 'User Profile Update', message: 'Your viewing date was set successfully!' }
                    });
              
                    // Handle the dialog close event
                    dialogRef.afterClosed().subscribe(() => {
                      // Redirect or perform other actions
                      // this.router.navigate(["/auth/settings"]);
                    });

                }, error => {
                    // Handle error
                    console.error('Error setting viewing date', error);
                });
        }
    }
  }

  onFilePicked(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      this.fileList = files;
      // Update the form with a boolean value or file names
      // const fileNames = Array.from(files).map(file => file.name);
      // this.documentForm.patchValue({ documents: fileNames.join(', ') });
      // Note: Do not set the actual FileList or File object in the form control
    }
  }

    onUploadDocuments() {
      if (!this.fileList || this.fileList.length === 0) {
        // Handle invalid form or no files selected
        return;
      }
      const formData = new FormData();
      for (let i = 0; i < this.fileList.length; i++) {
        formData.append('documents', this.fileList[i]);
      }
      // Call your service to upload the documents
      this.messageService.uploadDocuments(this.selectedConversation._id, formData)
      .subscribe(response => {
        // Handle successful upload
        console.log('Documents uploaded successfully', response);
         // Add the new documents to the appropriate array
      if (this.isUserPostCreator()) {
        this.selectedConversation.agreementDocuments.push(...response.documentPaths);
      } else {
        this.selectedConversation.signedAgreementDocuments.push(...response.documentPaths);
      }

      const dialogRef = this.dialog.open(ConfirmationDialogComponent1, {
        data: { title: 'Document Upload Update', message: 'Your Document was uploaded successfully!' }
      });

      // Handle the dialog close event
      dialogRef.afterClosed().subscribe(() => {
        // Redirect or perform other actions
        // this.router.navigate(["/auth/settings"]);
      });

    
      // Clear the file input
      this.fileList = null;
      this.documentForm.reset();

      }, error => {
        // Handle error
        console.error('Error uploading documents', error);
      });
      
    }


    updateViewingDate(conversationId: string, newDate: Date) {
      this.messageService.setViewingDate(conversationId, newDate).subscribe(response => {
        // Find and update the specific conversation with the new viewing date
        const index = this.conversations.findIndex(c => c._id === conversationId);
        if (index !== -1) {
          this.conversations[index].viewingDate = newDate;
        }
        // Optionally, refresh the selected conversation display
        if (this.selectedConversation && this.selectedConversation._id === conversationId) {
          this.selectConversation(this.conversations[index]);
        }
      }, error => {
        console.error('Error setting viewing date', error);
      });
    }


    previousImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
    }

    nextImage(imageCount: number) {
      if (this.currentImageIndex < imageCount - 1) {
        this.currentImageIndex++;
      }
    }


    setupNewMessageListener() {
      this.socketService.onNewMessage((message) => {
        const conversationIndex = this.conversations.findIndex(c => c._id === message.conversationId);
        console.log('New message received:', message);
        if (conversationIndex > -1) {
          const conversation = this.conversations[conversationIndex];
          
          // Increment the unread count only if this is not the currently selected conversation
          if (!this.selectedConversation || this.selectedConversation._id !== message.conversationId) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
    
          // Update the conversation list to reflect new message or unread count
          this.conversations[conversationIndex] = { ...conversation };
    
          // If the new message belongs to the selected conversation, update the message list
          if (this.isViewingConversation && this.selectedConversation && message.conversationId === this.selectedConversation._id) {
            this.selectConversation(this.selectedConversation); // Reload message
          }
        }
      });
    }
      
  resetUnreadCount(conversationId: string) {
    const conversationIndex = this.conversations.findIndex(c => c._id === conversationId);
    if (conversationIndex > -1) {
      const conversation = this.conversations[conversationIndex];
      conversation.unreadCount = 0;
      this.conversations[conversationIndex] = { ...conversation };
      this.messageService.markMessagesAsRead(conversationId).subscribe(() => {
        this.messageService.fetchUnreadMessageCount();
      });
    }
  }
      
    
      markConversationAsRead(conversationId: string) {
        this.conversationReadStatus[conversationId] = true;
        
      }
      
      

      selectConversationById(conversationId: string) {
        const conversation = this.conversations.find(c => c._id === conversationId);
        if (conversation) {
          this.selectConversation(conversation);
        } else {
          // If we're sure the conversation exists but is not in the loaded list,
          // we might need to fetch it from the server or handle this case appropriately.
          // For now, we log an error.
          console.error('Conversation not found: ', conversationId);
        }
      }
    

  formatDate(date: string) {
    // Formatting the date to a readable format
    return this.datePipe.transform(date, 'MMM d, h:mm a');
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Catch any errors that occur during scrolling
      //console.log(err)
    }
  }

  loadConversations(callback?: () => void) {
    this.isLoading = true;
    const userId = this.currentUserId;
    this.messageService.getAllConversationsForUser(userId).subscribe(conversations => {
      this.conversations = conversations.map((convo: { participants: any[], postId: string }) => {
        // Find the other participant's username
        const otherParticipant = convo.participants.find((participant: { _id: string; }) => participant._id !== userId);
        return { ...convo, otherParticipantUsername: otherParticipant?.username };
      });
      this.isLoading = false;
      if (callback) {
        callback(); // Call the callback function if provided
      }
    }, error => {
      // Handle error
      this.isLoading = false;
    });
  }
  
  
// messages.component.ts
  selectConversation(conversation: any) {
    this.selectedConversation = conversation;
    this.isViewingConversation = true;
    this.isLoading = true;
    this.messageService.getMessagesForConversation(conversation._id).subscribe(response => {
      this.selectedConversationMessages = response.messages.sort(
        (a: { createdAt: string | number | Date; }, b: { createdAt: string | number | Date; }) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      this.isLoading = false;
      this.resetUnreadCount(conversation._id);
      // this.renderPayPalButton();
    }, error => {
      console.error('Error fetching messages:', error);
      this.isLoading = false;
    });
  }


  onSendMessage() {
    if (this.messageForm.invalid) {
      return;
    }
    this.isLoading = true;
    const messageContent = this.messageForm.controls['content'].value;
    const recipientId = this.selectedConversation.participants.find((p: { _id: any; }) => p._id !== this.currentUserId)._id; // assuming this.currentUserId holds the ID of the current user

    // Check if we have a recipientId; if not, we cannot send the message
    if (!recipientId) {
      console.error('Recipient ID not found.');
      this.isLoading = false;
      return;
    }
    
    // Check if we have an existing conversationId
    if (this.selectedConversation && this.selectedConversation._id) {
      // Use replyToMessage for existing conversation
      this.messageService.replyMessage(this.selectedConversation._id, recipientId, messageContent).subscribe(() => {
        // Handle successful message sending
        this.afterMessageSent();
      }, (error: any) => {
        // Handle error
        this.handleMessageError(error);
      });
    } else {
      // Use createMessage for the first message in a new conversation
      this.messageService.sendMessage(recipientId, messageContent).subscribe(() => {
        // Handle successful message sending
        this.afterMessageSent();
      }, (error: any) => {
        // Handle error
        this.handleMessageError(error);
      });
    }
  }
  
  afterMessageSent() {
    // After sending the message, clear the form and reload the messages for the conversation
    this.messageForm.reset();
    this.selectConversation(this.selectedConversation); // Reload messages
    this.isLoading = false;
    this.scrollToBottom();
  }
  
  handleMessageError(error: any) {
    // Handle error
    console.error('Error sending message:', error);
    this.isLoading = false;
  }
  
  
  ngOnDestroy() {
    // Clean up the subscription when the component is destroyed
    //this.socketService.disconnectMessageListener();; // Assuming you have implemented this method
    this.isViewingConversation = false;
  }

}

  

