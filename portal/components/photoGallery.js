// TBS Photo Gallery Component
// Handles photo upload, viewing, and management

import { api, safe, uploadFile, loadMockData } from '../lib/api.js';
import { canUploadPhoto, canDeletePhoto, canEditPhoto, getUserRole } from '../lib/rbac.js';
import { openModal } from './modal.js';

export class PhotoGallery {
  constructor(projectId, container) {
    this.projectId = projectId;
    this.container = container;
    this.photos = [];
    this.currentFilter = 'all';
  }

  async init() {
    await this.loadPhotos();
    this.render();
  }

  async loadPhotos() {
    this.photos = await safe(
      api.get(`/api/projects/${this.projectId}/photos`),
      await this.loadMockPhotos()
    );
  }

  async loadMockPhotos() {
    const mock = await loadMockData('calendar');
    return [
      {
        id: 'photo-001',
        caption: 'Before work started',
        tag: 'before',
        filePath: '/assets/building1.png',
        uploadedBy: 'u-danny',
        createdAt: '2025-10-01T10:00:00Z'
      },
      {
        id: 'photo-002',
        caption: 'Work in progress',
        tag: 'during',
        filePath: '/assets/building2.png',
        uploadedBy: 'u-pat',
        createdAt: '2025-10-15T14:30:00Z'
      },
      {
        id: 'photo-003',
        caption: 'Final result',
        tag: 'after',
        filePath: '/assets/building3.png',
        uploadedBy: 'u-danny',
        createdAt: '2025-10-20T16:00:00Z'
      }
    ];
  }

  render() {
    this.container.innerHTML = this.createGalleryHTML();
    this.setupEventListeners();
  }

  createGalleryHTML() {
    const filteredPhotos = this.getFilteredPhotos();
    
    return `
      <div class="photo-gallery">
        <div class="gallery-header">
          <h3>Project Photos (${filteredPhotos.length})</h3>
          <div class="gallery-controls">
            <div class="filter-tabs">
              <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                All (${this.photos.length})
              </button>
              <button class="filter-tab ${this.currentFilter === 'before' ? 'active' : ''}" data-filter="before">
                Before (${this.photos.filter(p => p.tag === 'before').length})
              </button>
              <button class="filter-tab ${this.currentFilter === 'during' ? 'active' : ''}" data-filter="during">
                During (${this.photos.filter(p => p.tag === 'during').length})
              </button>
              <button class="filter-tab ${this.currentFilter === 'after' ? 'active' : ''}" data-filter="after">
                After (${this.photos.filter(p => p.tag === 'after').length})
              </button>
            </div>
            ${canUploadPhoto(getUserRole()) ? `
              <button class="btn btn-primary" id="uploadPhotosBtn">
                Upload Photos
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="photos-grid">
          ${filteredPhotos.length > 0 ? 
            filteredPhotos.map(photo => this.createPhotoItemHTML(photo)).join('') :
            '<p class="no-photos">No photos found for this filter.</p>'
          }
        </div>
      </div>
    `;
  }

  createPhotoItemHTML(photo) {
    return `
      <div class="photo-item" data-photo-id="${photo.id}">
        <div class="photo-thumbnail" onclick="window.openPhotoLightbox('${photo.id}')">
          <img src="${photo.filePath}" alt="${photo.caption}" loading="lazy">
          <div class="photo-overlay">
            <span class="photo-tag tag-${photo.tag}">${photo.tag}</span>
            <div class="photo-actions">
              ${canEditPhoto(getUserRole()) ? `
                <button class="btn btn-secondary btn-sm" onclick="window.editPhoto('${photo.id}')">
                  Edit
                </button>
              ` : ''}
              ${canDeletePhoto(getUserRole()) ? `
                <button class="btn btn-danger btn-sm" onclick="window.deletePhoto('${photo.id}')">
                  Delete
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="photo-info">
          <p class="photo-caption">${photo.caption}</p>
          <p class="photo-meta">
            Uploaded by ${photo.uploadedBy} on ${new Date(photo.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    `;
  }

  getFilteredPhotos() {
    if (this.currentFilter === 'all') {
      return this.photos;
    }
    return this.photos.filter(photo => photo.tag === this.currentFilter);
  }

  setupEventListeners() {
    // Filter tabs
    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.render();
      });
    });

    // Upload button
    const uploadBtn = this.container.querySelector('#uploadPhotosBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.openUploadModal());
    }
  }

  async openUploadModal() {
    const bodyNode = this.createUploadFormNode();
    
    await openModal({
      title: 'Upload Photos',
      bodyNode,
      size: 'medium',
      actions: [
        {
          label: 'Cancel',
          kind: 'secondary',
          onClick: () => {}
        },
        {
          label: 'Upload',
          kind: 'primary',
          onClick: () => this.uploadPhotos()
        }
      ]
    });
  }

  createUploadFormNode() {
    const form = document.createElement('form');
    form.id = 'photoUploadForm';
    form.className = 'photo-upload-form';

    form.innerHTML = `
      <div class="form-group">
        <label for="photoFiles">Select Photos *</label>
        <input type="file" id="photoFiles" name="files" multiple accept="image/*" required>
        <p class="form-help">Select multiple images to upload at once</p>
      </div>
      
      <div class="form-group">
        <label for="photoTag">Category *</label>
        <select id="photoTag" name="tag" required>
          <option value="">Select category</option>
          <option value="before">Before</option>
          <option value="during">During</option>
          <option value="after">After</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="photoCaption">Caption</label>
        <textarea id="photoCaption" name="caption" rows="3" placeholder="Optional caption for all photos..."></textarea>
      </div>
      
      <div id="uploadProgress" class="upload-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <p class="progress-text">Uploading...</p>
      </div>
    `;

    return form;
  }

  async uploadPhotos() {
    const form = document.getElementById('photoUploadForm');
    if (!form) return;

    const formData = new FormData(form);
    const files = formData.getAll('files');
    const tag = formData.get('tag');
    const caption = formData.get('caption');

    if (files.length === 0) {
      alert('Please select at least one photo to upload.');
      return;
    }

    if (!tag) {
      alert('Please select a category for the photos.');
      return;
    }

    try {
      this.showUploadProgress();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        fileFormData.append('tag', tag);
        fileFormData.append('caption', caption || file.name);

        await this.uploadSinglePhoto(fileFormData);
        this.updateUploadProgress((i + 1) / files.length * 100);
      }

      await this.loadPhotos();
      this.render();
      this.hideUploadProgress();
      
    } catch (error) {
      console.error('Upload failed:', error);
      this.hideUploadProgress();
      alert('Upload failed. Please try again.');
    }
  }

  async uploadSinglePhoto(formData) {
    // Try API first, fallback to mock
    try {
      return await uploadFile(`/api/projects/${this.projectId}/photos`, formData);
    } catch (error) {
      // Mock upload - just log it
      console.log('Mock photo upload:', formData);
      return { id: `photo-${Date.now()}`, success: true };
    }
  }

  showUploadProgress() {
    const progress = document.getElementById('uploadProgress');
    if (progress) {
      progress.style.display = 'block';
    }
  }

  hideUploadProgress() {
    const progress = document.getElementById('uploadProgress');
    if (progress) {
      progress.style.display = 'none';
    }
  }

  updateUploadProgress(percentage) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Uploading... ${Math.round(percentage)}%`;
    }
  }
}

// Global functions for photo actions
window.openPhotoLightbox = (photoId) => {
  // Find photo data
  const photo = document.querySelector(`[data-photo-id="${photoId}"]`);
  if (!photo) return;

  const img = photo.querySelector('img');
  const caption = photo.querySelector('.photo-caption').textContent;
  
  // Create lightbox modal
  const lightboxBody = document.createElement('div');
  lightboxBody.className = 'photo-lightbox';
  lightboxBody.innerHTML = `
    <div class="lightbox-image">
      <img src="${img.src}" alt="${caption}">
    </div>
    <div class="lightbox-caption">
      <p>${caption}</p>
    </div>
  `;

  openModal({
    title: 'Photo View',
    bodyNode: lightboxBody,
    size: 'large',
    actions: [
      {
        label: 'Close',
        kind: 'secondary',
        onClick: () => {}
      }
    ]
  });
};

window.editPhoto = (photoId) => {
  // Find photo data
  const photo = document.querySelector(`[data-photo-id="${photoId}"]`);
  if (!photo) return;

  const caption = photo.querySelector('.photo-caption').textContent;
  
  const editBody = document.createElement('form');
  editBody.innerHTML = `
    <div class="form-group">
      <label for="editCaption">Caption</label>
      <input type="text" id="editCaption" value="${caption}">
    </div>
    <div class="form-group">
      <label for="editTag">Category</label>
      <select id="editTag">
        <option value="before">Before</option>
        <option value="during">During</option>
        <option value="after">After</option>
      </select>
    </div>
  `;

  openModal({
    title: 'Edit Photo',
    bodyNode: editBody,
    actions: [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      },
      {
        label: 'Save',
        kind: 'primary',
        onClick: () => {
          const newCaption = document.getElementById('editCaption').value;
          const newTag = document.getElementById('editTag').value;
          console.log('Edit photo:', photoId, { caption: newCaption, tag: newTag });
        }
      }
    ]
  });
};

window.deletePhoto = (photoId) => {
  if (confirm('Are you sure you want to delete this photo?')) {
    console.log('Delete photo:', photoId);
    // Remove from DOM
    const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`);
    if (photoElement) {
      photoElement.remove();
    }
  }
};

export function createPhotoGallery(projectId, container) {
  const gallery = new PhotoGallery(projectId, container);
  return gallery.init();
}
