<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = ['course_code', 'course_title', 'description', 'units', 'status'];

    protected function casts(): array
    {
        return ['units' => 'integer'];
    }

    public function offerings(): HasMany
    {
        return $this->hasMany(CourseOffering::class);
    }
}
