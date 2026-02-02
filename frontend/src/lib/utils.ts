import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleLimitExceededError(error: any): string {
  if (error?.response?.status === 429) {
    const errorData = error.response.data;
    if (errorData?.error === 'Message limit exceeded') {
      return 'You have reached your message limit. Please upgrade to continue using AI features.';
    } else if (errorData?.error === 'Email limit exceeded') {
      return 'You have reached your email limit. Please upgrade to continue using email features.';
    } else if (errorData?.message) {
      return errorData.message;
    }
  }
  return error?.response?.data?.error || 'An error occurred. Please try again.';
}

export function showLimitExceededToast(error: any, toast: any) {
  const message = handleLimitExceededError(error);
  toast.error(message, {
    position: "top-center",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
}
