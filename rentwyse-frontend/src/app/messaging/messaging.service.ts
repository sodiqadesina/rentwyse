// message.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';


@Injectable({
  providedIn: 'root'
})
export class MessageService {

  private BACKEND_URL =    environment.apiUrl; 

  constructor(private http: HttpClient, private authService: AuthService) {}

  // In message.service.ts
private unreadMessageCount = new BehaviorSubject<number>(0);

getUnreadMessageCount(): Observable<number> {
  return this.unreadMessageCount.asObservable();
}

updateUnreadMessageCount(count: number) {
  this.unreadMessageCount.next(count);
}


deleteDocument(conversationId: string, filename: string) {
  return this.http.delete(`${this.BACKEND_URL}/conversations/${conversationId}/delete-document/${filename}`);
}

// Method to download a document
downloadDocument(filename: string) {
  return this.http.get(`${this.BACKEND_URL}/conversations/documents/${filename}`, { responseType: 'blob' });
}



uploadDocuments(conversationId: string, documents: FormData): Observable<any> {
  console.log(documents)
  return this.http.post(`${this.BACKEND_URL}/conversations/${conversationId}/upload-document`, documents);
}


startOrGetConversation(partnerId: string, postId: string): Observable<any> {
  return this.http.post(`${this.BACKEND_URL}/conversations/start`, { recipientId: partnerId, postId: postId });
}

setViewingDate(conversationId: string, viewingDate: Date): Observable<any> {
  return this.http.post(`${this.BACKEND_URL}/conversations/${conversationId}/setViewingDate`, { viewingDate });
}


  getMessagesForConversation(conversationId: string): Observable<any> {
    return this.http.get(`${this.BACKEND_URL}/conversations/${conversationId}/messages`);
  }

  getAllConversationsForUser(userId: string): Observable<any> {
    return this.http.get(`${this.BACKEND_URL}/conversations/user/${userId}`);
  }

  sendMessage(receiver: string, content: string): Observable<any> {
    return this.http.post(`${this.BACKEND_URL}/messages`, { receiver, content });
  }

  replyMessage(conversationId: string, receiver: string, content: string): Observable<any> {
    return this.http.post(`${this.BACKEND_URL}/messages`,  { conversationId, receiver, content });
  }

  markMessagesAsRead(conversationId: string): Observable<any> {
    // Call the service to mark messages as read
    this.fetchUnreadMessageCount();
    return this.http.patch(`${this.BACKEND_URL}/messages/markAsRead/${conversationId}`, {})
      
  }

fetchUnreadMessageCount(): void {
  const userId = this.authService.getUserId();
  this.http.get<{ count: number }>(`${this.BACKEND_URL}/messages/unreadCount/${userId}`)
    .subscribe(response => {
      this.updateUnreadMessageCount(response.count);
    });
}
  
//payment


// // Method to initiate PayPal transaction
// createPayPalTransaction(conversationId: string): Observable<any> {
//   return this.http.post(`${this.BACKEND_URL}/conversations/create-paypal-transaction`, { conversationId });
// }

// // Method to update payment status
// updatePaymentStatus(conversationId: string): Observable<any> {
//   return this.http.patch(`${this.BACKEND_URL}/conversations/${conversationId}/update-payment-status`, {});
// }






}
