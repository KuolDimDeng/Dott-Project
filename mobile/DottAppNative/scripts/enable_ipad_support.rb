#!/usr/bin/env ruby

require 'xcodeproj'

# Open the project
project_path = 'ios/DottAppNative.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the main app target
app_target = project.targets.find { |t| t.name == 'DottAppNative' }

if app_target
  # Update build configurations for both Debug and Release
  app_target.build_configurations.each do |config|
    # Set to support both iPhone (1) and iPad (2)
    config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
    
    # Ensure we're building for the correct iOS version
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] ||= '15.1'
    
    # Enable iPad-specific features
    config.build_settings['SUPPORTS_MACCATALYST'] = 'NO'
    config.build_settings['SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD'] = 'YES'
    
    puts "Updated #{config.name} configuration for iPad support"
  end
  
  # Save the project
  project.save
  
  puts "✅ Successfully enabled iPad support for DottAppNative"
  puts "📱 The app now supports both iPhone and iPad"
else
  puts "❌ Could not find DottAppNative target"
end