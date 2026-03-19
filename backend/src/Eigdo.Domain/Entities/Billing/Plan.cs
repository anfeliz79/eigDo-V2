namespace Eigdo.Domain.Entities.Billing;

public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int MaxCompanies { get; set; } = 1;
    public int IncludedDocumentsPerMonth { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<Price> Prices { get; set; } = new List<Price>();
}
