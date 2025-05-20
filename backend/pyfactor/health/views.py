from django.http import HttpResponse

def health_check(request):
    """
    Simple health check endpoint for AWS Elastic Beanstalk
    """
    return HttpResponse("OK", content_type="text/plain")
