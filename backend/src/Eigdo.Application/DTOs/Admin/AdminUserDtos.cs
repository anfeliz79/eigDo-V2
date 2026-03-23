using System.ComponentModel.DataAnnotations;

namespace Eigdo.Application.DTOs.Admin;

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SystemRole { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public bool IsActive { get; set; }
}

public class CreateAdminUserRequest
{
    [Required(ErrorMessage = "El email es requerido.")]
    [EmailAddress(ErrorMessage = "El email no es valido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El apellido es requerido.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida.")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es requerido.")]
    public string SystemRole { get; set; } = string.Empty;
}

public class UpdateAdminUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? SystemRole { get; set; }
    public bool? IsActive { get; set; }
}
