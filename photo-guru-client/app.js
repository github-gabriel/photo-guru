import axios from 'axios'

const dropzone = document.getElementById('dropzone')
const fileInput = document.getElementById('fileInput')
const hintInput = document.getElementById('hintInput')
const uploadButton = document.getElementById('uploadButton')
const answer = document.getElementById('answer')

let selectedFiles = null

uploadButton.disabled = true

function dropHandler (event) {
  event.preventDefault()
  uploadButton.disabled = false
  dropzone.classList.remove('hover')
  selectedFiles = event.dataTransfer.files

  showPreviews(selectedFiles)
}

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropzone.classList.add('hover')
})

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('hover')
})

dropzone.addEventListener('drop', dropHandler) // Call defined function

// Handle click on the input field
fileInput.addEventListener('change', (event) => {
  uploadFile(event.target.files)
})

uploadButton.addEventListener('click', () => {
  if (selectedFiles) {
    uploadFile(selectedFiles)
    deletePreview()
    selectedFiles = null // Clear selected files after upload
  } else {
    alert('Please select files to upload.')
  }
})

function deletePreview () {
  const previewGrid = document.querySelector('.preview-grid')
  while (previewGrid.firstChild) {
    previewGrid.removeChild(previewGrid.firstChild)
  }
}

function showPreviews (files) {
  const previewGrid = document.querySelector('.preview-grid')

  for (const file of files) {
    const preview = document.createElement('div')
    preview.classList.add('preview')

    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    preview.appendChild(img)

    previewGrid.appendChild(preview)
  }
}

function uploadFile (files) {
  uploadButton.disabled = true // Disable the button

  // Loading animation
  const loadingContainer = document.querySelector('.loading-container')
  loadingContainer.style.visibility = 'visible'

  // Create a FormData object
  const formData = new FormData()
  for (const file of files) {
    formData.append('images', file)
  }
  if (hintInput.value) {
    formData.append('hint', hintInput.value)
  }

  // Use Axios for the request
  axios.post('http://127.0.0.1:5000/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
    .then(response => {
      selectedFiles = null // Clear selected files after upload
      if (response.data.message) {
        loadingContainer.style.visibility = 'hidden' // Hide loading animation
        answer.textContent = response.data.message // Show answer
      } else if (response.data.error) {
        loadingContainer.style.visibility = 'hidden' // Hide loading animation
        alert(response.data.error) // Show error message
      }
    })
    .catch(error => {
      console.error(error)
      alert('Error uploading files')
    })
}