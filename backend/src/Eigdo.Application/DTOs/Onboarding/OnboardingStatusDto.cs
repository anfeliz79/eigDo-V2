using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Onboarding;

public class OnboardingStatusDto
{
    public OnboardingStep CurrentStep { get; set; }
    public int CompletionPercentage { get; set; }
    public Dictionary<OnboardingStep, List<string>> MissingItems { get; set; } = new();
}

/// <summary>Response DTO returned by API controllers.</summary>
public class OnboardingStatusResponse : OnboardingStatusDto { }

public class AdvanceStepRequest
{
    public OnboardingStep Step { get; set; }
}
