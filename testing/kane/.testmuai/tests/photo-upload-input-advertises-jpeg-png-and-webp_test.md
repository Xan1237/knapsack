---
assurance:
  id: t-71
  base: sha256:dadb98b52bf4223bf99230a2ee0db7d98fc91c2dd6fc6dc38fb3bbfc1dbf5df9
---
# Photo upload input advertises JPEG PNG and WebP

> Navigate directly to the desktop /pack workspace and inspect the existing Upload item photos file input's DOM accept attribute for image/jpeg, image/png, and image/webp without uploading a file.

## Step 1 @verifies ac-71

Navigate directly to {{knapsack_base_url}}/pack on the desktop web app and inspect the existing file input accessible as Upload item photos, then assert its DOM accept attribute advertises image/jpeg, image/png, and image/webp.
