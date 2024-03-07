import axios from 'axios'

const dropzone = document.getElementById('dropzone')
const fileInput = document.getElementById('fileInput')
const hintInput = document.getElementById('hintInput')
const uploadButton = document.getElementById('uploadButton')
const answer = document.getElementById('answer')

const darkModeToggle = document.getElementById('toggle')

const checkboxContainer = document.querySelector('.checkbox-container')

const darkIcon = 'icons/moon.svg'
const lightIcon = 'icons/sun.svg'

const editCheckbox = document.getElementById('edit')
const similarCheckbox = document.getElementById('similar')
const keepCheckbox = document.getElementById('keep')
const ideaCheckbox = document.getElementById('idea')

let selectedFiles = null
let mode = null

uploadButton.disabled = true

editCheckbox.checked = true

window.onload = function () {
  let theme = localStorage.getItem('theme')
  if (theme === 'dark') {
    setTheme('dark')
  } else if (theme === 'light') {
    setTheme('light')
  }
}

editCheckbox.addEventListener('click', function () {
  if (editCheckbox.checked) {
    mode = 'image_comparison_editing'
    fileInput.multiple = true
  }
})

similarCheckbox.addEventListener('click', function () {
  if (similarCheckbox.checked) {
    mode = 'image_comparison_subject'
    fileInput.multiple = true
  }
})

keepCheckbox.addEventListener('click', function () {
  if (keepCheckbox.checked) {
    mode = 'keep_or_delete'
    fileInput.multiple = false
  }
})

ideaCheckbox.addEventListener('click', function () {
  if (ideaCheckbox.checked) {
    mode = 'idea'
    fileInput.multiple = false
  }
})

darkModeToggle.addEventListener('click', function () {
  if (document.body.classList.contains('dark-theme')) {
    setTheme('light')
  } else {
    setTheme('dark')
  }
})

checkboxContainer.addEventListener('click', function (event) {
  if (event.target.type === 'checkbox') {
    const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]')
    for (let i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i] !== event.target) {
        checkboxes[i].checked = false // Uncheck other checkboxes
      }
    }
  }
})

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
  event.preventDefault()
  uploadButton.disabled = false
  selectedFiles = event.target.files

  showPreviews(selectedFiles)
})

uploadButton.addEventListener('click', () => {
  if (selectedFiles && selectedFiles.length > 1 && fileInput.multiple === true || selectedFiles && selectedFiles.length === 1 && fileInput.multiple === false) {
    uploadFile(selectedFiles)
    deletePreview()
    selectedFiles = null // Clear selected files after upload
  } else if (!selectedFiles) {
    alert('Please select files to upload.')
  } else if (selectedFiles && selectedFiles.length > 1 && fileInput.multiple === false) {
    alert('Please select only one file.')
  } else if (selectedFiles && selectedFiles.length === 1 && fileInput.multiple === true) {
    alert('Please select multiple files.')
  }
})

function setTheme (theme) {
  let themeImg = darkModeToggle.childNodes[1]
  let uploadImg = document.getElementById('uploadButton').childNodes[1]
  if (theme === 'dark') {
    themeImg.src = darkIcon
    uploadImg.src = 'icons/upload_white.svg'
    localStorage.setItem('theme', 'dark')
    document.body.classList.add('dark-theme')
  } else if (theme === 'light') {
    themeImg.src = lightIcon
    uploadImg.src = 'icons/upload_black.svg'
    localStorage.setItem('theme', 'light')
    document.body.classList.remove('dark-theme')
  }
}

function dropHandler (event) {
  event.preventDefault()
  uploadButton.disabled = false
  dropzone.classList.remove('hover')
  selectedFiles = event.dataTransfer.files

  showPreviews(selectedFiles)
}

function isRawFileExtension (fileName) {
  // Split the filename by the dot (.) to separate extension
  const parts = fileName.split('.')
  // Get the extension in lowercase for case-insensitive comparison
  const extension = parts[parts.length - 1].toLowerCase()

  // Array of common raw image extensions
  const rawExtensions = ['rw2']

  // Check if the extension is present in the array
  return rawExtensions.includes(extension)
}

function deletePreview () {
  const previewGrid = document.querySelector('.preview-grid')
  while (previewGrid.firstChild) {
    previewGrid.removeChild(previewGrid.firstChild)
  }
}

function showPreviews (files) {
  const previewGrid = document.querySelector('.preview-grid')

  for (const file of files) {
    // Grid consisting of the image previews
    const preview = document.createElement('div')
    preview.classList.add('preview')

    // Image preview
    if (isRawFileExtension(file.name)) {
      const p = document.createElement('p')
      p.textContent = file.name
      preview.appendChild(p)
    } else {
      const img = document.createElement('img')
      img.src = URL.createObjectURL(file)
      preview.appendChild(img)
    }

    // Close button to remove the image
    const close = document.createElement('img')
    close.classList.add('remove-image', 'hidden')
    close.src = 'icons/close_white.svg'
    close.addEventListener('click', () => {
      selectedFiles = Array.from(selectedFiles).filter(f => f !== file) // Remove the file from the array
      preview.remove() // Remove the preview
      if (previewGrid.children.length === 0) {
        uploadButton.disabled = true // Disable the button if there are no files left
      }
    })
    preview.appendChild(close)

    preview.addEventListener('mouseenter', function () {
      this.querySelector('.remove-image').classList.remove('hidden') // Show close button
    })
    preview.addEventListener('mouseleave', function () {
      this.querySelector('.remove-image').classList.add('hidden') // Hide close button
    })

    previewGrid.appendChild(preview)
  }
}

function uploadFile (files) {
  answer.textContent = '' // Clear answer
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
  if (mode) {
    formData.append('mode', mode)
  } else {
    alert('Please select a mode')
    loadingContainer.style.visibility = 'hidden' // Hide loading animation
    return
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
      loadingContainer.style.visibility = 'hidden' // Hide loading animation
      console.error(error)
      alert('Error uploading files')
    })
}
