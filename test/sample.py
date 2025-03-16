class Person:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def greet(self) -> str:
        return f"Hello, my name is {self.name} and I am {self.age} years old!"

def calculate_square(number: int) -> int:
    """
    Calculate the square of a number.
    
    Args:
        number: The input number
    
    Returns:
        The square of the input number
    """
    return number * number

# Create a person instance
person = Person("Alice", 30)
result = person.greet()
print(result)

# Test the calculate function
number = 5
square = calculate_square(number)
print(f"The square of {number} is {square}")