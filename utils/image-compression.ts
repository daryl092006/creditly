/**
 * Compresse une image côté client pour réduire le poids des uploads.
 * Idéal pour les KYC sur mobile avec des connexions lentes.
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<File> {
    if (!file.type.startsWith('image/')) return file // Ne pas compresser les PDF par exemple

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Garder le ratio
                if (width > maxWidth) {
                    height = (maxWidth / width) * height
                    width = maxWidth
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            })
                            resolve(compressedFile)
                        } else {
                            resolve(file) // Fallback sur l'original si échec
                        }
                    },
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = () => resolve(file)
        }
        reader.onerror = () => resolve(file)
    })
}
