# Compiler settings 
CXX=g++
# CXXFLAGS=-std=c++17 -fsanitize=thread -O0 -g
CXXFLAGS=-std=c++17 -O2
LDFLAGS=-lpthread

# Target executable
TARGET=aliasing

# Source and object files
SRC=aliasing.cpp
OBJ=$(SRC:.cpp=.o)

# Build rule
all: $(TARGET)

$(TARGET): $(OBJ)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Clean rule
clean:
	rm -f $(OBJ) $(TARGET)

.PHONY: all clean
