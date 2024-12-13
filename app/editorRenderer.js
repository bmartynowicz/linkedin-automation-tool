// editorRenderer.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Editor Renderer loaded.');

    let isModalOpen = false;
    let quill;
    let editingPostId = null;
    let lastSuggestionTime = 0;
    let suggestionCooldown = false;
  
    // Editor Elements
    const toolbar = document.getElementById('toolbar');
    const postTitleInput = document.getElementById('post-title');
    const suggestionBox = document.getElementById('suggestion-box');
    const suggestionText = document.getElementById('suggestion-text');
    const manualSuggestButton = document.getElementById('manual-suggest-button');
    const acceptButton = document.getElementById('accept-suggestion');
    const rejectButton = document.getElementById('reject-suggestion');
    const closeSuggestionBoxButton = document.getElementById('close-suggestion-box');
    const emojiBulletButton = document.getElementById('ql-custom-bullet');
    const createNewPostEditorButton = document.getElementById('create-new-post-editor');
    const savePostButton = document.getElementById('save-post');
    const openSavedPostsButton = document.getElementById('open-saved-posts');
    const toggleDistractionFreeButton = document.getElementById('toggle-distraction-free');
  
    // Suggestion Config
    const suggestionKeywords = ['help', 'need', 'assist', 'improve', 'suggest', 'idea'];
    const TYPING_PAUSE_DURATION = 3000; 
    const SUGGESTION_COOLDOWN_DURATION = 10000;
  
    function showToast(message) {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerText = message;
    
      toastContainer.appendChild(toast);
    
      setTimeout(() => {
        toast.classList.add('show');
      }, 100);
    
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toastContainer.removeChild(toast);
        }, 500);
      }, 3000);
    }
  
    function openModal(modal) {
      if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        isModalOpen = true;
        console.log(`Modal opened: ${modal.id}`);
      }
    }
  
    function closeModal(modal) {
      if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        isModalOpen = false;
        console.log(`Modal closed: ${modal.id}`);
      }
    }
  
    function toggleElement(element, className) {
      element.classList.toggle(className);
      return element.classList.contains(className);
    }
  
    // Initialize Quill Editor
    if (typeof Quill !== 'undefined') {
      console.log('Quill is available.');
  
      const Block = Quill.import('blots/block');
      class CustomBullet extends Block {
        static create(value) {
          const node = super.create();
          node.setAttribute('data-custom-bullet', value || '◾');
          node.style.listStyleType = 'none';
          node.style.display = 'list-item';
          node.style.paddingLeft = '20px';
          node.style.textIndent = '-20px';
          return node;
        }
  
        static formats(node) {
          return node.getAttribute('data-custom-bullet') || '◾';
        }
  
        format(name, value) {
          if (name === CustomBullet.blotName && value) {
            this.domNode.setAttribute('data-custom-bullet', value);
          } else {
            super.format(name, value);
          }
        }
      }
  
      CustomBullet.blotName = 'custom-bullet';
      CustomBullet.tagName = 'LI';
      Quill.register(CustomBullet, true);
  
      quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
          toolbar: {
            container: '#toolbar',
            handlers: {
              'custom-bullet': function () {
                const range = this.quill.getSelection();
                if (range) {
                  const currentFormat = this.quill.getFormat(range.index, range.length);
                  if (currentFormat['custom-bullet']) {
                    this.quill.format('custom-bullet', false);
                    console.log('Custom bullet removed.');
                  } else {
                    this.quill.format('custom-bullet', '◾');
                    console.log('Custom bullet applied.');
                  }
                } else {
                  console.error('No text selected.');
                }
              },
            },
          },
          'emoji-toolbar': true,
          history: {
            delay: 1000,
            maxStack: 100,
            userOnly: true,
          },
        },
        formats: [
          'bold', 'italic', 'underline', 'header', 'emoji', 'custom-bullet',
        ],
      });
  
      console.log('Quill editor initialized.');
  
      if (emojiBulletButton) {
        emojiBulletButton.addEventListener('click', () => {
          const range = quill.getSelection();
          if (range) {
            const currentFormat = quill.getFormat(range.index, range.length);
            if (currentFormat['custom-bullet']) {
              quill.format('custom-bullet', false);
              console.log('Custom bullet removed.');
            } else {
              quill.format('custom-bullet', '◾');
              console.log('Custom bullet applied.');
            }
          } else {
            console.error('No text selected.');
          }
        });
      } else {
        console.error('Custom bullet button not found in toolbar.');
      }
  
      console.log('Custom bullet list initialized.');
  
      if (toolbar) {
        toolbar.addEventListener('click', (e) => {
          if (e.target.closest('.ql-undo')) {
            quill.history.undo();
          } else if (e.target.closest('.ql-redo')) {
            quill.history.redo();
          }
        });
      }
  
      quill.on('editor-change', () => {
        const editorElement = document.querySelector('.ql-editor');
        if (editorElement) {
          editorElement.setAttribute('spellcheck', 'true');
        }
      });
  
      const editorElement = document.querySelector('.ql-editor');
      if (editorElement) {
        editorElement.setAttribute('spellcheck', 'true');
      }
  
      // Autosave Draft
      setInterval(() => {
        if (quill && postTitleInput) {
          const draft = {
            title: postTitleInput.value.trim(),
            content: quill.root.innerHTML.trim(),
            lastSaved: new Date().toLocaleTimeString(),
          };
          localStorage.setItem('draft', JSON.stringify(draft));
          console.log(`Autosaved at ${draft.lastSaved}`);
        }
      }, 15000);
  
      if (createNewPostEditorButton) {
        createNewPostEditorButton.addEventListener('click', () => {
          if (quill && postTitleInput) {
            quill.setContents([]);
            postTitleInput.value = '';
            showToast('Ready to create a new post.');
          } else {
            showToast('Editor is not initialized.');
            console.error('Quill or Post Title Input is not available.');
          }
        });
      }
  
      if (savePostButton) {
        savePostButton.addEventListener('click', async () => {
          const user = await window.api.fetchUserData();
          if (!user || !user.linkedin_id) {
            showToast('Unable to fetch user information. Please log in again.');
            return;
          }
      
          const post = {
            id: editingPostId,
            title: postTitleInput.value.trim(),
            content: quill.root.innerHTML.trim(),
            status: 'draft',
            linkedin_id: user.linkedin_id,
          };
      
          try {
            const result = await window.api.savePost(post);
            if (result.success) {
              showToast('Post saved successfully!');
              postTitleInput.value = '';
              quill.setContents([]);
              editingPostId = null;
            }
          } catch (error) {
            console.error('Error saving post:', error.message);
            showToast('Failed to save post.');
          }
        });
      }
  
      const fetchSuggestion = async (isManual = false) => {
        if (isModalOpen) return;
        const userInput = quill.getText().trim();
  
        if (isManual && userInput.length === 0) {
          showToast('Please enter some text in the editor.');
          return;
        }
  
        const now = Date.now();
        if (!isManual && (suggestionCooldown || now - lastSuggestionTime < SUGGESTION_COOLDOWN_DURATION)) {
          return;
        }
  
        try {
          if (isManual) {
            manualSuggestButton.disabled = true;
            manualSuggestButton.classList.add('loading');
          }
  
          const { user, userPreferences } = await window.api.getCurrentUserWithPreferences();
          const userId = user.id;
          const options = { tone: userPreferences.tone, theme: userPreferences.theme };
  
          const suggestion = await window.api.getAISuggestions(userInput, options, userId);
          console.log('Fetched suggestion:', suggestion);
  
          if (suggestion) {
            suggestionText.innerText = suggestion;
            showSuggestionBox();
            lastSuggestionTime = now;
            suggestionCooldown = true;
            setTimeout(() => {
              suggestionCooldown = false;
            }, SUGGESTION_COOLDOWN_DURATION);
          } else {
            suggestionBox.classList.remove('show');
            if (isManual) showToast('No suggestion available at this time.');
          }
        } catch (error) {
          console.error('Error fetching AI suggestion:', error);
          suggestionBox.classList.remove('show');
          if (isManual) showToast('An error occurred while fetching the suggestion.');
        } finally {
          if (isManual) {
            manualSuggestButton.disabled = false;
            manualSuggestButton.classList.remove('loading');
          }
        }
      };
  
      const showSuggestionBox = () => {
        const range = quill.getSelection();
        if (!range) return;
  
        const bounds = quill.getBounds(range.index);
        const containerRect = quill.container.getBoundingClientRect();
  
        suggestionBox.style.visibility = 'hidden';
        suggestionBox.style.display = 'block';
        const suggestionBoxRect = suggestionBox.getBoundingClientRect();
        suggestionBox.style.visibility = '';
        suggestionBox.style.display = '';
  
        let top, left;
        const fixedHeaderHeight = 60;
        const fixedFooterHeight = 0;
  
        const cursorTop = containerRect.top + bounds.bottom;
        const cursorLeft = containerRect.left + bounds.left;
  
        const availableSpaceBelow = window.innerHeight - cursorTop - fixedFooterHeight - 10;
        const availableSpaceAbove = cursorTop - fixedHeaderHeight - 10;
  
        if (window.innerWidth <= 600) {
          suggestionBox.style.top = null;
          suggestionBox.style.left = null;
          suggestionBox.style.transform = null;
          suggestionBox.style.maxHeight = `${window.innerHeight - fixedHeaderHeight - fixedFooterHeight - 20}px`;
          suggestionBox.style.overflowY = 'auto';
        } else {
          if (availableSpaceBelow >= suggestionBoxRect.height || availableSpaceBelow >= availableSpaceAbove) {
            top = cursorTop + 5;
            suggestionBox.style.maxHeight = `${availableSpaceBelow}px`;
          } else {
            top = cursorTop - suggestionBoxRect.height - bounds.height - 5;
            suggestionBox.style.maxHeight = `${availableSpaceAbove}px`;
          }
  
          left = cursorLeft + 5;
          if (left + suggestionBoxRect.width > window.innerWidth) {
            left = window.innerWidth - suggestionBoxRect.width - 10;
          }
  
          suggestionBox.style.top = `${top}px`;
          suggestionBox.style.left = `${left}px`;
          suggestionBox.style.overflowY = 'auto';
        }
  
        suggestionBox.classList.add('show');
      };
  
      if (manualSuggestButton) {
        manualSuggestButton.addEventListener('click', () => {
          fetchSuggestion(true);
        });
      }
  
      quill.on('text-change', (() => {
        const debounce = (func, delay) => {
          let timeout;
          return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
          };
        };
  
        return debounce(() => {
          const userInput = quill.getText().toLowerCase();
          const keywordDetected = suggestionKeywords.some(keyword => userInput.includes(keyword));
          if (keywordDetected) {
            fetchSuggestion(false);
          }
        }, TYPING_PAUSE_DURATION);
      })());
  
      if (acceptButton && rejectButton) {
        acceptButton.addEventListener('click', async () => {
          const suggestion = suggestionText.innerText;
          quill.insertText(quill.getLength(), ` ${suggestion}`);
          suggestionBox.classList.remove('show');
          await window.api.sendFeedback('accepted', suggestion);
  
          lastSuggestionTime = Date.now();
          suggestionCooldown = true;
          setTimeout(() => {
            suggestionCooldown = false;
          }, SUGGESTION_COOLDOWN_DURATION);
        });
  
        rejectButton.addEventListener('click', async () => {
          const suggestion = suggestionText.innerText;
          suggestionBox.classList.remove('show');
          await window.api.sendFeedback('rejected', suggestion);
  
          lastSuggestionTime = Date.now();
          suggestionCooldown = true;
          setTimeout(() => {
            suggestionCooldown = false;
          }, SUGGESTION_COOLDOWN_DURATION / 2);
        });
      }
  
      if (closeSuggestionBoxButton) {
        closeSuggestionBoxButton.addEventListener('click', async () => {
          suggestionBox.classList.remove('show');
          await window.api.sendFeedback('closed', suggestionText.innerText);
  
          lastSuggestionTime = Date.now();
          suggestionCooldown = true;
          setTimeout(() => {
            suggestionCooldown = false;
          }, SUGGESTION_COOLDOWN_DURATION / 2);
        });
      }
  
      if (toggleDistractionFreeButton) {
        toggleDistractionFreeButton.addEventListener('click', () => {
          const isDistractionFree = toggleElement(document.body, 'distraction-free');
          toggleDistractionFreeButton.innerHTML = isDistractionFree 
            ? '<i class="fas fa-eye"></i> Exit Focus Mode' 
            : '<i class="fas fa-eye-slash"></i> Focus Mode';
        });
      }
  
      const saveDraftButton = document.createElement('button');
      saveDraftButton.id = 'save-draft';
      saveDraftButton.innerText = 'Save Draft';
      saveDraftButton.classList.add('editor-action-button', 'save-draft-button');
  
      saveDraftButton.addEventListener('click', () => {
        if (quill && postTitleInput) {
          const draft = {
            title: postTitleInput.value.trim(),
            content: quill.root.innerHTML.trim(),
          };
          localStorage.setItem('draft', JSON.stringify(draft));
          showToast('Draft saved successfully!');
        } else {
          showToast('Editor is not initialized.');
          console.error('Quill or Post Title Input is not available.');
        }
      });
  
      const savedDraft = localStorage.getItem('draft');
      if (savedDraft && quill && postTitleInput) {
        const { title, content } = JSON.parse(savedDraft);
        postTitleInput.value = title || '';
        quill.root.innerHTML = content || '';
      }
  
      // Accessibility Enhancements for editor-related modals (if any)
      document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeModal(modal);
        });
      });
  
    } else {
      console.error('Quill is not available.');
    }
  
  });  