from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for Event model with automatic tenant handling.
    """
    created_by_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'start_datetime',
            'end_datetime',
            'all_day',
            'event_type',
            'description',
            'location',
            'reminder_minutes',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        """Return the name of the user who created the event."""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def validate(self, data):
        """
        Validate that end_datetime is after start_datetime.
        """
        start = data.get('start_datetime')
        end = data.get('end_datetime')
        
        # For updates, get existing values if not provided
        if self.instance:
            start = start or self.instance.start_datetime
            end = end or self.instance.end_datetime
        
        if start and end and end <= start:
            raise serializers.ValidationError({
                'end_datetime': 'End date/time must be after start date/time.'
            })
        
        return data