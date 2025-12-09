import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostsMapComponent } from './posts-map.component';

describe('PostsMapComponent', () => {
  let component: PostsMapComponent;
  let fixture: ComponentFixture<PostsMapComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PostsMapComponent]
    });
    fixture = TestBed.createComponent(PostsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
