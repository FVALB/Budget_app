'use client'

import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadDropzone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const dragCount = useRef(0)

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCount.current++
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCount.current--
    if (dragCount.current <= 0) {
      dragCount.current = 0
      setDragging(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCount.current = 0
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (isPdf) onFile(file)
  }

  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="rounded-full bg-muted p-3 pointer-events-none">
        {dragging ? (
          <FileText className="h-6 w-6 text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="pointer-events-none">
        <p className="text-sm font-medium">Drop your bank PDF here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
      </div>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}
