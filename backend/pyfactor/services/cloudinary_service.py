"""
Cloudinary Service for Africa-Optimized Media Storage
FREE Tier: 25GB storage, 25GB bandwidth/month
"""
import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.conf import settings
import logging
import os
from typing import Optional, Dict, Any
import mimetypes

logger = logging.getLogger(__name__)

class CloudinaryService:
    """
    Handles all media uploads to Cloudinary with Africa-specific optimizations
    """
    
    def __init__(self):
        """Initialize Cloudinary with credentials"""
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
            api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET', ''),
            secure=True,  # Always use HTTPS
            cdn_subdomain=True  # Use multiple CDN subdomains for better performance
        )
        
        # Africa-optimized default transformations
        self.default_image_transformations = [
            {'quality': 'auto:eco'},  # Economy mode for low bandwidth
            {'fetch_format': 'auto'},  # Auto WebP/AVIF where supported
            {'flags': 'progressive'},  # Progressive loading for slow connections
            {'width': 1200, 'crop': 'limit'}  # Max width to save bandwidth
        ]
        
        self.default_voice_transformations = [
            {'audio_codec': 'mp3'},  # Universal compatibility
            {'bit_rate': '64k'}  # Lower bitrate for voice (still good quality)
        ]
        
        self.default_video_transformations = [
            {'quality': 'auto:low'},  # Lower quality for Africa bandwidth
            {'video_codec': 'h264'},  # Universal compatibility
            {'width': 720, 'crop': 'limit'}  # Max 720p for mobile
        ]
    
    def upload_voice_note(self, file_data, conversation_id: str, user_id: str) -> Dict[str, Any]:
        """
        Upload voice note with Africa-optimized settings
        
        Args:
            file_data: Audio file data
            conversation_id: Chat conversation ID
            user_id: User ID for organization
            
        Returns:
            Dict with URL and metadata
        """
        try:
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file_data,
                resource_type='video',  # Audio files use 'video' resource type
                folder=f'voice_notes/{user_id[:8]}/{conversation_id[:8]}',
                public_id=f'voice_{conversation_id[:8]}_{os.urandom(4).hex()}',
                transformation=self.default_voice_transformations,
                eager=[  # Create optimized versions
                    {'audio_codec': 'aac', 'bit_rate': '32k'}  # Ultra-low bandwidth version
                ],
                eager_async=True,  # Process transformations asynchronously
                tags=['voice_note', 'chat', 'africa'],
                context={'alt': 'Voice message'}
            )
            
            logger.info(f"Voice note uploaded: {result['public_id']}")
            
            return {
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'duration': result.get('duration', 0),
                'size': result['bytes'],
                'format': result['format'],
                'low_bandwidth_url': result['eager'][0]['secure_url'] if result.get('eager') else None
            }
            
        except Exception as e:
            logger.error(f"Failed to upload voice note: {e}")
            raise
    
    def upload_image(self, file_data, purpose: str = 'chat', user_id: str = None) -> Dict[str, Any]:
        """
        Upload image with automatic optimization for African mobile networks
        
        Args:
            file_data: Image file data
            purpose: 'chat', 'profile', 'product', etc.
            user_id: User ID for organization
            
        Returns:
            Dict with URLs and metadata
        """
        try:
            # Different optimizations based on purpose
            transformations = self.default_image_transformations.copy()
            
            if purpose == 'profile':
                transformations.append({'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'})
            elif purpose == 'product':
                transformations.append({'width': 800, 'height': 800, 'crop': 'pad'})
            
            folder = f'{purpose}/{user_id[:8] if user_id else "general"}'
            
            result = cloudinary.uploader.upload(
                file_data,
                resource_type='image',
                folder=folder,
                transformation=transformations,
                eager=[
                    # Thumbnail for chat list
                    {'width': 150, 'height': 150, 'crop': 'fill', 'quality': 'auto:low'},
                    # Medium size for in-chat view
                    {'width': 400, 'crop': 'limit', 'quality': 'auto:eco'}
                ],
                eager_async=True,
                tags=[purpose, 'africa'],
                use_filename=True,
                unique_filename=True
            )
            
            logger.info(f"Image uploaded: {result['public_id']}")
            
            return {
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'thumbnail_url': result['eager'][0]['secure_url'] if result.get('eager') else None,
                'medium_url': result['eager'][1]['secure_url'] if len(result.get('eager', [])) > 1 else None,
                'width': result['width'],
                'height': result['height'],
                'size': result['bytes'],
                'format': result['format']
            }
            
        except Exception as e:
            logger.error(f"Failed to upload image: {e}")
            raise
    
    def upload_video(self, file_data, conversation_id: str = None, max_duration: int = 60) -> Dict[str, Any]:
        """
        Upload video with heavy optimization for African bandwidth
        
        Args:
            file_data: Video file data
            conversation_id: Optional conversation ID
            max_duration: Maximum duration in seconds (default 60)
            
        Returns:
            Dict with URLs and metadata
        """
        try:
            folder = f'videos/{conversation_id[:8] if conversation_id else "general"}'
            
            result = cloudinary.uploader.upload(
                file_data,
                resource_type='video',
                folder=folder,
                transformation=self.default_video_transformations,
                eager=[
                    # Generate thumbnail
                    {'width': 400, 'height': 300, 'crop': 'fill', 'resource_type': 'image'},
                    # Ultra-low bandwidth version for 2G/3G
                    {'width': 480, 'video_codec': 'h264', 'bit_rate': '250k', 'audio_codec': 'aac'}
                ],
                eager_async=True,
                max_duration=max_duration,
                tags=['video', 'chat', 'africa']
            )
            
            logger.info(f"Video uploaded: {result['public_id']}")
            
            return {
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'thumbnail_url': self.get_video_thumbnail_url(result['public_id']),
                'low_bandwidth_url': result['eager'][1]['secure_url'] if len(result.get('eager', [])) > 1 else None,
                'duration': result.get('duration', 0),
                'size': result['bytes'],
                'format': result['format']
            }
            
        except Exception as e:
            logger.error(f"Failed to upload video: {e}")
            raise
    
    def upload_document(self, file_data, filename: str, user_id: str = None) -> Dict[str, Any]:
        """
        Upload documents (PDFs, etc.) to Cloudinary
        
        Args:
            file_data: Document file data
            filename: Original filename
            user_id: User ID for organization
            
        Returns:
            Dict with URL and metadata
        """
        try:
            # Detect MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            resource_type = 'raw'  # Documents use 'raw' type
            
            folder = f'documents/{user_id[:8] if user_id else "general"}'
            
            result = cloudinary.uploader.upload(
                file_data,
                resource_type=resource_type,
                folder=folder,
                public_id=filename.rsplit('.', 1)[0],  # Use filename without extension
                use_filename=True,
                unique_filename=True,
                tags=['document', 'africa'],
                context={'original_filename': filename}
            )
            
            logger.info(f"Document uploaded: {result['public_id']}")
            
            return {
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'filename': filename,
                'size': result['bytes'],
                'format': result['format']
            }
            
        except Exception as e:
            logger.error(f"Failed to upload document: {e}")
            raise
    
    def delete_media(self, public_id: str, resource_type: str = 'image') -> bool:
        """
        Delete media from Cloudinary
        
        Args:
            public_id: Cloudinary public ID
            resource_type: 'image', 'video', or 'raw'
            
        Returns:
            True if deleted successfully
        """
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get('result') == 'ok'
        except Exception as e:
            logger.error(f"Failed to delete media {public_id}: {e}")
            return False
    
    def get_video_thumbnail_url(self, video_public_id: str) -> str:
        """
        Generate thumbnail URL for a video
        
        Args:
            video_public_id: Video's public ID in Cloudinary
            
        Returns:
            Thumbnail URL
        """
        return cloudinary.utils.cloudinary_url(
            video_public_id,
            resource_type='video',
            transformation=[
                {'width': 400, 'height': 300, 'crop': 'fill'},
                {'quality': 'auto:low'},
                {'format': 'jpg'}
            ]
        )[0]
    
    def get_optimized_url(self, public_id: str, transformations: list = None) -> str:
        """
        Get optimized URL with custom transformations
        
        Args:
            public_id: Media public ID
            transformations: List of transformation dicts
            
        Returns:
            Optimized URL
        """
        if not transformations:
            transformations = self.default_image_transformations
        
        return cloudinary.utils.cloudinary_url(
            public_id,
            transformation=transformations
        )[0]
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """
        Get current usage statistics (for monitoring FREE tier limits)
        
        Returns:
            Dict with usage statistics
        """
        try:
            usage = cloudinary.api.usage()
            
            # FREE tier limits
            FREE_STORAGE_GB = 25
            FREE_BANDWIDTH_GB = 25
            FREE_TRANSFORMATIONS = 7500
            
            storage_used_gb = usage['storage']['usage'] / (1024 ** 3)
            bandwidth_used_gb = usage['bandwidth']['usage'] / (1024 ** 3)
            
            return {
                'storage_used_gb': round(storage_used_gb, 2),
                'storage_limit_gb': FREE_STORAGE_GB,
                'storage_percentage': round((storage_used_gb / FREE_STORAGE_GB) * 100, 1),
                'bandwidth_used_gb': round(bandwidth_used_gb, 2),
                'bandwidth_limit_gb': FREE_BANDWIDTH_GB,
                'bandwidth_percentage': round((bandwidth_used_gb / FREE_BANDWIDTH_GB) * 100, 1),
                'transformations_used': usage.get('transformations', {}).get('usage', 0),
                'transformations_limit': FREE_TRANSFORMATIONS,
                'credits_used': usage.get('credits', {}).get('usage', 0)
            }
        except Exception as e:
            logger.error(f"Failed to get usage stats: {e}")
            return {}
    
    def cleanup_old_media(self, days_old: int = 90, resource_type: str = 'image') -> int:
        """
        Clean up old media files (for retention policy)
        
        Args:
            days_old: Delete files older than this many days
            resource_type: Type of resources to delete
            
        Returns:
            Number of files deleted
        """
        try:
            # Search for old files
            results = cloudinary.api.resources(
                type='upload',
                resource_type=resource_type,
                max_results=500,
                tags=True
            )
            
            deleted_count = 0
            cutoff_date = timezone.now() - timedelta(days=days_old)
            
            for resource in results.get('resources', []):
                created_at = datetime.fromisoformat(resource['created_at'].replace('Z', '+00:00'))
                if created_at < cutoff_date:
                    if self.delete_media(resource['public_id'], resource_type):
                        deleted_count += 1
            
            logger.info(f"Deleted {deleted_count} old {resource_type} files")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old media: {e}")
            return 0

# Singleton instance
cloudinary_service = CloudinaryService()