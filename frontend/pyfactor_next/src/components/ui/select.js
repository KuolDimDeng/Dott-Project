import * as React from "react"

export const Select = ({ children, ...props }) => {
  return (
    <select
      className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      {children}
    </select>
  )
}

export const SelectTrigger = ({ children, className, ...props }) => {
  return (
    <div className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export const SelectValue = ({ placeholder, ...props }) => {
  return <span {...props}>{placeholder}</span>
}

export const SelectContent = ({ children, ...props }) => {
  return <div {...props}>{children}</div>
}

export const SelectItem = ({ children, value, ...props }) => {
  return <option value={value} {...props}>{children}</option>
}